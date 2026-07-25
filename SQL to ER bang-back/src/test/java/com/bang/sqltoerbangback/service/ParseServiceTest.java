package com.bang.sqltoerbangback.service;

import com.bang.sqltoerbangback.exception.BizException;
import com.bang.sqltoerbangback.model.dto.ExampleResponse;
import com.bang.sqltoerbangback.model.dto.ParseResponse;
import com.bang.sqltoerbangback.model.vo.ColumnInfo;
import com.bang.sqltoerbangback.model.vo.ForeignKeyInfo;
import com.bang.sqltoerbangback.model.vo.TableInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ParseService 单元测试
 * 覆盖接口文档第 9 节全部测试用例
 */
@SpringBootTest
class ParseServiceTest {

    @Autowired
    private ParseService parseService;

    // ==================== 正常解析 ====================

    @Test
    @DisplayName("TC-01: 正常单表解析")
    void testParseSingleTable() {
        String sql = """
                CREATE TABLE `user` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
                  `name` VARCHAR(50) NOT NULL COMMENT '用户名'
                ) COMMENT='用户表';
                """;

        ParseResponse result = parseService.parse(sql);

        assertEquals(1, result.getTables().size());
        TableInfo table = result.getTables().get(0);
        assertEquals("user", table.getTableName());
        assertEquals("用户表", table.getTableComment());
        assertEquals(2, table.getColumns().size());
    }

    @Test
    @DisplayName("TC-02: 多表批量解析")
    void testParseMultipleTables() {
        String sql = """
                CREATE TABLE `user` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT
                ) COMMENT='用户表';
                CREATE TABLE `order` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT,
                  `user_id` INT NOT NULL,
                  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
                ) COMMENT='订单表';
                CREATE TABLE `order_item` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT,
                  `order_id` INT NOT NULL,
                  FOREIGN KEY (`order_id`) REFERENCES `order`(`id`)
                ) COMMENT='订单明细表';
                """;

        ParseResponse result = parseService.parse(sql);

        assertEquals(3, result.getTables().size());
    }

    @Test
    @DisplayName("TC-03: 主键识别（列级 PRIMARY KEY）")
    void testPrimaryKeyColumnLevel() {
        String sql = """
                CREATE TABLE `user` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT,
                  `name` VARCHAR(50) NOT NULL
                );
                """;

        ParseResponse result = parseService.parse(sql);

        TableInfo table = result.getTables().get(0);
        assertTrue(table.getPrimaryKeys().contains("id"));
        assertEquals(1, table.getPrimaryKeys().size());

        // 列级标记也应正确
        ColumnInfo idCol = table.getColumns().get(0);
        assertTrue(idCol.isPrimaryKey());
        assertTrue(idCol.isAutoIncrement());
    }

    @Test
    @DisplayName("TC-04: 主键识别（表级 PRIMARY KEY）")
    void testPrimaryKeyTableLevel() {
        String sql = """
                CREATE TABLE `order_item` (
                  `order_id` INT NOT NULL,
                  `product_id` INT NOT NULL,
                  `quantity` INT NOT NULL,
                  PRIMARY KEY (`order_id`, `product_id`)
                );
                """;

        ParseResponse result = parseService.parse(sql);

        TableInfo table = result.getTables().get(0);
        assertEquals(2, table.getPrimaryKeys().size());
        assertTrue(table.getPrimaryKeys().contains("order_id"));
        assertTrue(table.getPrimaryKeys().contains("product_id"));
    }

    @Test
    @DisplayName("TC-05: 外键识别")
    void testForeignKey() {
        String sql = """
                CREATE TABLE `order` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT,
                  `user_id` INT NOT NULL,
                  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
                );
                """;

        ParseResponse result = parseService.parse(sql);

        TableInfo table = result.getTables().get(0);
        assertEquals(1, table.getForeignKeys().size());

        ForeignKeyInfo fk = table.getForeignKeys().get(0);
        assertEquals("user_id", fk.getColumnName());
        assertEquals("user", fk.getReferencedTable());
        assertEquals("id", fk.getReferencedColumn());
    }

    @Test
    @DisplayName("TC-06: 注释提取（表注释 + 列注释）")
    void testCommentExtraction() {
        String sql = """
                CREATE TABLE `user` (
                  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
                  `name` VARCHAR(50) NOT NULL COMMENT '用户名'
                ) COMMENT='用户表';
                """;

        ParseResponse result = parseService.parse(sql);

        TableInfo table = result.getTables().get(0);
        assertEquals("用户表", table.getTableComment());
        assertEquals("用户ID", table.getColumns().get(0).getComment());
        assertEquals("用户名", table.getColumns().get(1).getComment());
    }

    @Test
    @DisplayName("TC-07: 字段类型与长度/精度识别")
    void testColumnTypes() {
        String sql = """
                CREATE TABLE `test` (
                  `a` INT,
                  `b` VARCHAR(50),
                  `c` DECIMAL(10,2),
                  `d` TEXT,
                  `e` DATETIME
                );
                """;

        ParseResponse result = parseService.parse(sql);

        List<ColumnInfo> cols = result.getTables().get(0).getColumns();

        assertEquals("INT", cols.get(0).getType());

        assertEquals("VARCHAR", cols.get(1).getType());
        assertEquals(50, cols.get(1).getLength());

        assertEquals("DECIMAL", cols.get(2).getType());
        assertEquals(10, cols.get(2).getLength());
        assertEquals(2, cols.get(2).getPrecision());

        assertEquals("TEXT", cols.get(3).getType());

        assertEquals("DATETIME", cols.get(4).getType());
    }

    @Test
    @DisplayName("TC-08: nullable 识别")
    void testNullable() {
        String sql = """
                CREATE TABLE `test` (
                  `a` INT NOT NULL,
                  `b` VARCHAR(50),
                  `c` INT NULL
                );
                """;

        ParseResponse result = parseService.parse(sql);
        List<ColumnInfo> cols = result.getTables().get(0).getColumns();

        assertFalse(cols.get(0).isNullable()); // NOT NULL
        assertTrue(cols.get(1).isNullable());  // 无约束 → 可空
        assertTrue(cols.get(2).isNullable());  // NULL → 可空
    }

    @Test
    @DisplayName("TC-09: 默认值提取")
    void testDefaultValue() {
        String sql = """
                CREATE TABLE `test` (
                  `status` VARCHAR(20) DEFAULT 'pending',
                  `count` INT DEFAULT 0,
                  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                """;

        ParseResponse result = parseService.parse(sql);
        List<ColumnInfo> cols = result.getTables().get(0).getColumns();

        assertEquals("pending", cols.get(0).getDefaultValue());
        assertEquals("0", cols.get(1).getDefaultValue());
        assertNotNull(cols.get(2).getDefaultValue()); // CURRENT_TIMESTAMP
    }

    @Test
    @DisplayName("TC-10: 反引号和引号处理")
    void testQuoteStripping() {
        String sql = """
                CREATE TABLE `my_user` (
                  `user_id` INT PRIMARY KEY
                ) COMMENT='我的用户表';
                """;

        ParseResponse result = parseService.parse(sql);

        TableInfo table = result.getTables().get(0);
        assertEquals("my_user", table.getTableName());
        assertEquals("user_id", table.getColumns().get(0).getName());
        assertEquals("我的用户表", table.getTableComment());
    }

    // ==================== 错误场景 ====================

    @Test
    @DisplayName("TC-11: SQL 为空 → BizException(40001)")
    void testEmptySql() {
        BizException ex = assertThrows(BizException.class, () -> parseService.parse(""));
        assertEquals(40001, ex.getCode());
    }

    @Test
    @DisplayName("TC-12: SQL 为 null → BizException(40001)")
    void testNullSql() {
        BizException ex = assertThrows(BizException.class, () -> parseService.parse(null));
        assertEquals(40001, ex.getCode());
    }

    @Test
    @DisplayName("TC-13: SQL 超长 → BizException(40002)")
    void testSqlTooLong() {
        String longSql = "CREATE TABLE t (id INT);\n".repeat(5000);
        BizException ex = assertThrows(BizException.class, () -> parseService.parse(longSql));
        assertEquals(40002, ex.getCode());
    }

    @Test
    @DisplayName("TC-14: SQL 语法错误 → BizException(40003)")
    void testSyntaxError() {
        String badSql = "CREAT TABLE t (id INT)";
        BizException ex = assertThrows(BizException.class, () -> parseService.parse(badSql));
        assertEquals(40003, ex.getCode());
    }

    @Test
    @DisplayName("TC-15: 非 CREATE TABLE → BizException(40004)")
    void testNoCreateTable() {
        String selectSql = "SELECT * FROM user";
        BizException ex = assertThrows(BizException.class, () -> parseService.parse(selectSql));
        assertEquals(40004, ex.getCode());
    }

    // ==================== 示例 SQL ====================

    @Test
    @DisplayName("TC-16: 获取示例 SQL")
    void testGetExample() {
        ExampleResponse example = parseService.getExample();

        assertEquals("电商系统示例", example.getTitle());
        assertEquals(3, example.getTableCount());
        assertEquals(2, example.getRelationCount());
        assertNotNull(example.getSql());
        assertTrue(example.getSql().contains("CREATE TABLE"));
    }
}
