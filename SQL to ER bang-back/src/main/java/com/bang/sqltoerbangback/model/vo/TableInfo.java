package com.bang.sqltoerbangback.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 表信息 VO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TableInfo {

    /** 表名 */
    private String tableName;

    /** 表注释 */
    private String tableComment;

    /** 列信息 */
    private List<ColumnInfo> columns;

    /** 主键列名列表 */
    private List<String> primaryKeys;

    /** 外键列表 */
    private List<ForeignKeyInfo> foreignKeys;
}
