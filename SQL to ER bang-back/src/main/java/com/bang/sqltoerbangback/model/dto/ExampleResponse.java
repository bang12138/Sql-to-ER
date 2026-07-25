package com.bang.sqltoerbangback.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GET /api/example 响应 data 字段
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExampleResponse {

    /** 示例标题 */
    private String title;

    /** 示例 SQL 文本 */
    private String sql;

    /** 示例中的表数量 */
    private int tableCount;

    /** 示例中的外键关系数量 */
    private int relationCount;
}
