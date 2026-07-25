package com.bang.sqltoerbangback.service.impl;

import com.bang.sqltoerbangback.exception.BizException;
import com.bang.sqltoerbangback.model.dto.ExampleResponse;
import com.bang.sqltoerbangback.model.dto.ParseResponse;
import com.bang.sqltoerbangback.model.vo.ColumnInfo;
import com.bang.sqltoerbangback.model.vo.ForeignKeyInfo;
import com.bang.sqltoerbangback.model.vo.TableInfo;
import com.bang.sqltoerbangback.service.ParseService;
import com.bang.sqltoerbangback.util.SqlValidator;
import lombok.extern.slf4j.Slf4j;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.Statements;
import net.sf.jsqlparser.statement.create.table.ColDataType;
import net.sf.jsqlparser.statement.create.table.ColumnDefinition;
import net.sf.jsqlparser.statement.create.table.CreateTable;
import net.sf.jsqlparser.statement.create.table.ForeignKeyIndex;
import net.sf.jsqlparser.statement.create.table.Index;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * SQL 解析服务实现
 */
@Slf4j
@Service
public class ParseServiceImpl implements ParseService {

    @Override
    public ParseResponse parse(String sql) {
        // 1. 校验
        if (SqlValidator.isBlank(sql)) {
            throw BizException.sqlEmpty();
        }
        if (SqlValidator.isTooLong(sql)) {
            throw BizException.sqlTooLong(SqlValidator.getLength(sql));
        }

        // 2. 解析
        List<TableInfo> tables;
        try {
            Statements statements = CCJSqlParserUtil.parseStatements(sql);
            tables = new ArrayList<>();

            for (Statement stmt : statements.getStatements()) {
                if (stmt instanceof CreateTable createTable) {
                    tables.add(extractTableInfo(createTable));
                }
            }

            if (tables.isEmpty()) {
                throw BizException.noCreateTable();
            }

        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("SQL 解析失败", e);
            throw BizException.sqlSyntaxError(e.getMessage());
        }

        log.info("解析成功，共识别 {} 张表", tables.size());
        return new ParseResponse(tables);
    }

    /**
     * 从 CreateTable AST 中提取表信息
     */
    private TableInfo extractTableInfo(CreateTable createTable) {
        String tableName = SqlValidator.stripQuotes(createTable.getTable().getName());

        // 提取列信息
        List<ColumnInfo> columns = extractColumns(createTable);

        // 提取主键
        List<String> primaryKeys = extractPrimaryKeys(createTable, columns);

        // 标记列级主键
        markColumnPrimaryKeys(columns, primaryKeys);

        // 提取外键
        List<ForeignKeyInfo> foreignKeys = extractForeignKeys(createTable);

        // 提取表注释
        String tableComment = extractTableComment(createTable);

        return new TableInfo(tableName, tableComment, columns, primaryKeys, foreignKeys);
    }

    /**
     * 提取列定义
     */
    private List<ColumnInfo> extractColumns(CreateTable createTable) {
        List<ColumnInfo> columns = new ArrayList<>();

        for (ColumnDefinition colDef : createTable.getColumnDefinitions()) {
            ColumnInfo info = new ColumnInfo();

            // 列名
            info.setName(SqlValidator.stripQuotes(colDef.getColumnName()));

            // 数据类型（去除 JSqlParser 5.x 附加的长度部分，如 "VARCHAR (50)" → "VARCHAR"）
            ColDataType colDataType = colDef.getColDataType();
            String rawType = colDataType.getDataType();
            String cleanType = rawType.replaceAll("\\(.*\\)", "").trim().toUpperCase();
            info.setType(cleanType);

            // 长度和精度：JSqlParser 5.1 嵌在 rawType 中（如 "VARCHAR (50)"，"DECIMAL (10, 2)"）
            parseLengthAndPrecision(rawType, info);

            // columnSpecs：统一转为大写列表，并防御 null
            List<String> rawSpecs = colDef.getColumnSpecs();
            List<String> specs = (rawSpecs == null)
                    ? List.of()
                    : rawSpecs.stream().map(String::toUpperCase).toList();

            // 可否为空：检查是否存在连续的 NOT NULL
            info.setNullable(!containsConsecutive(specs, "NOT", "NULL"));

            // 主键（列级 PRIMARY KEY）
            info.setPrimaryKey(specs.contains("PRIMARY") || specs.contains("PRIMARY KEY"));

            // 自增
            info.setAutoIncrement(specs.contains("AUTO_INCREMENT")
                    || specs.contains("AUTOINCREMENT"));

            // 默认值：从 specs 中提取 DEFAULT 后面的值
            info.setDefaultValue(extractDefaultValue(rawSpecs));

            // 列注释
            info.setComment(extractColumnComment(colDef));

            columns.add(info);
        }
        return columns;
    }

    /**
     * 从 JSqlParser 5.1 的 rawType 字符串中提取长度和精度
     * 输入示例: "VARCHAR (50)" → length=50; "DECIMAL (10, 2)" → length=10, precision=2
     */
    private void parseLengthAndPrecision(String rawType, ColumnInfo info) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\((\\d+)(?:,\\s*(\\d+))?\\)").matcher(rawType);
        if (m.find()) {
            try {
                info.setLength(Integer.parseInt(m.group(1)));
            } catch (NumberFormatException ignored) {
            }
            if (m.group(2) != null) {
                try {
                    info.setPrecision(Integer.parseInt(m.group(2)));
                } catch (NumberFormatException ignored) {
                }
            }
        }
    }
    private boolean containsConsecutive(List<String> list, String first, String second) {
        for (int i = 0; i < list.size() - 1; i++) {
            if (list.get(i).equals(first) && list.get(i + 1).equals(second)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 从 columnSpecs 原始列表中提取 DEFAULT 后面的值
     * 例如: ["DEFAULT", "'pending'"] → "pending"
     *        ["DEFAULT", "CURRENT_TIMESTAMP"] → "CURRENT_TIMESTAMP"
     */
    private String extractDefaultValue(List<String> rawSpecs) {
        if (rawSpecs == null) {
            return null;
        }
        for (int i = 0; i < rawSpecs.size() - 1; i++) {
            if ("DEFAULT".equalsIgnoreCase(rawSpecs.get(i))) {
                return stripCommentQuotes(rawSpecs.get(i + 1));
            }
        }
        return null;
    }

    /**
     * 提取主键列表（表级约束 + 列级约束）
     */
    private List<String> extractPrimaryKeys(CreateTable createTable, List<ColumnInfo> columns) {
        List<String> pks = new ArrayList<>();

        // 表级 PRIMARY KEY 约束
        if (createTable.getIndexes() != null) {
            Index pkIndex = createTable.getIndexes().stream()
                    .filter(idx -> "PRIMARY KEY".equalsIgnoreCase(idx.getType()))
                    .findFirst()
                    .orElse(null);

            if (pkIndex != null) {
                List<String> colNames = pkIndex.getColumnsNames();
                if (colNames != null) {
                    for (String colName : colNames) {
                        pks.add(SqlValidator.stripQuotes(colName));
                    }
                }
            }
        }

        return pks;
    }

    /**
     * 将列级主键标记补充到 primaryKeys 列表
     */
    private void markColumnPrimaryKeys(List<ColumnInfo> columns, List<String> primaryKeys) {
        for (ColumnInfo col : columns) {
            if (col.isPrimaryKey() && !primaryKeys.contains(col.getName())) {
                primaryKeys.add(col.getName());
            }
        }
    }

    /**
     * 提取外键信息
     */
    private List<ForeignKeyInfo> extractForeignKeys(CreateTable createTable) {
        List<ForeignKeyInfo> foreignKeys = new ArrayList<>();

        if (createTable.getIndexes() == null) {
            return foreignKeys;
        }

        for (Index index : createTable.getIndexes()) {
            if (!"FOREIGN KEY".equalsIgnoreCase(index.getType())) {
                continue;
            }

            ForeignKeyInfo fk = new ForeignKeyInfo();
            fk.setConstraintName(index.getName());

            // 外键列名
            List<String> columnsNames = index.getColumnsNames();
            if (columnsNames != null && !columnsNames.isEmpty()) {
                fk.setColumnName(SqlValidator.stripQuotes(columnsNames.get(0)));
            }

            // 引用表和列（ForeignKeyIndex 子类才有这些方法）
            if (index instanceof ForeignKeyIndex fkIndex) {
                if (fkIndex.getReferencedColumnNames() != null && !fkIndex.getReferencedColumnNames().isEmpty()) {
                    String refCol = fkIndex.getReferencedColumnNames().get(0);
                    fk.setReferencedColumn(SqlValidator.stripQuotes(refCol));
                }
                if (fkIndex.getTable() != null) {
                    fk.setReferencedTable(SqlValidator.stripQuotes(fkIndex.getTable().getName()));
                }
            }

            foreignKeys.add(fk);
        }

        return foreignKeys;
    }

    /**
     * 提取表注释
     */
    private String extractTableComment(CreateTable createTable) {
        if (createTable.getTableOptionsStrings() == null) {
            return null;
        }

        List<String> opts = createTable.getTableOptionsStrings();
        for (int i = 0; i < opts.size(); i++) {
            String opt = opts.get(i).trim();

            if (!"COMMENT".equalsIgnoreCase(opt)) {
                continue;
            }

            // 三种可能的格式:
            // 格式1: ["COMMENT", "='值'"]          → i+1 是 "='值'"
            // 格式2: ["COMMENT", "=", "'值'"]    → i+1 是 "=", i+2 是 "'值'"
            // 格式3: ["COMMENT='值'"]             → 单令牌（不太可能）

            if (i + 1 < opts.size()) {
                String next = opts.get(i + 1).trim();

                // 格式1: "='值'"
                if (next.startsWith("=")) {
                    String result = stripCommentQuotes(next.substring(1));
                    if (result != null && !result.isEmpty()) {
                        return result;
                    }
                }

                // 格式2: "=" + "'值'" (三令牌)
                if ("=".equals(next) && i + 2 < opts.size()) {
                    String result = stripCommentQuotes(opts.get(i + 2));
                    if (result != null && !result.isEmpty()) {
                        return result;
                    }
                }
            }

            // 格式3: 单令牌 "COMMENT='值'"
            if (opt.length() > "COMMENT".length()) {
                String after = opt.substring("COMMENT".length()).trim();
                if (after.startsWith("=")) {
                    after = after.substring(1);
                }
                String result = stripCommentQuotes(after);
                if (result != null && !result.isEmpty()) {
                    return result;
                }
            }
        }
        return null;
    }

    /**
     * 提取列注释（从 columnSpecs 中解析 COMMENT '...'）
     */
    private String extractColumnComment(ColumnDefinition colDef) {
        List<String> specs = colDef.getColumnSpecs();
        if (specs == null) {
            return null;
        }
        for (int i = 0; i < specs.size() - 1; i++) {
            if ("COMMENT".equalsIgnoreCase(specs.get(i))) {
                return stripCommentQuotes(specs.get(i + 1));
            }
        }
        return null;
    }

    /**
     * 去除注释字符串的引号包裹
     */
    private String stripCommentQuotes(String comment) {
        if (comment == null) {
            return null;
        }
        String stripped = comment.trim();
        if ((stripped.startsWith("'") && stripped.endsWith("'"))
                || (stripped.startsWith("\"") && stripped.endsWith("\""))) {
            stripped = stripped.substring(1, stripped.length() - 1);
        }
        return stripped;
    }

    // ==================== 示例 SQL ====================

    private static final String EXAMPLE_SQL = """
            -- 用户表
            CREATE TABLE `user` (
              `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
              `username` VARCHAR(50) NOT NULL COMMENT '用户名',
              `email` VARCHAR(100) COMMENT '邮箱',
              `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
            ) COMMENT='用户表';

            -- 订单表
            CREATE TABLE `order` (
              `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
              `user_id` INT NOT NULL COMMENT '用户ID',
              `total_price` DECIMAL(10,2) NOT NULL COMMENT '总价',
              `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
              FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
            ) COMMENT='订单表';

            -- 订单明细表
            CREATE TABLE `order_item` (
              `id` INT PRIMARY KEY AUTO_INCREMENT,
              `order_id` INT NOT NULL,
              `product_name` VARCHAR(200) NOT NULL,
              `quantity` INT NOT NULL DEFAULT 1,
              `unit_price` DECIMAL(10,2) NOT NULL,
              FOREIGN KEY (`order_id`) REFERENCES `order`(`id`)
            ) COMMENT='订单明细表';
            """;

    @Override
    public ExampleResponse getExample() {
        return new ExampleResponse("电商系统示例", EXAMPLE_SQL, 3, 2);
    }
}
