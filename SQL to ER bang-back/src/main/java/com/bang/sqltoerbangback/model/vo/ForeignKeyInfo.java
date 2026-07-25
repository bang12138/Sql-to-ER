package com.bang.sqltoerbangback.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 外键信息 VO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ForeignKeyInfo {

    /** 约束名 */
    private String constraintName;

    /** 本表外键列名 */
    private String columnName;

    /** 引用的目标表名 */
    private String referencedTable;

    /** 引用的目标列名 */
    private String referencedColumn;
}
