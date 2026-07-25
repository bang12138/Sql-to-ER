package com.bang.sqltoerbangback.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POST /api/parse 请求体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParseRequest {

    /** SQL 建表语句文本 */
    @NotBlank(message = "SQL 语句不能为空")
    @Size(max = 102400, message = "SQL 语句过长，最大支持 100KB")
    private String sql;
}
