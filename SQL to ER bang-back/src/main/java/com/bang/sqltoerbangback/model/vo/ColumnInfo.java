package com.bang.sqltoerbangback.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 列信息 VO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColumnInfo {

    /** 列名 */
    private String name;

    /** 数据类型（大写） */
    private String type;

    /** 长度 */
    private Integer length;

    /** 精度（DECIMAL 等） */
    private Integer precision;

    /** 是否可为空 */
    private boolean nullable;

    /** 是否主键 */
    private boolean primaryKey;

    /** 是否自增 */
    private boolean autoIncrement;

    /** 默认值 */
    private String defaultValue;

    /** 列注释 */
    private String comment;
}
