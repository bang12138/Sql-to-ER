package com.bang.sqltoerbangback.model.dto;

import com.bang.sqltoerbangback.model.vo.TableInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * POST /api/parse 响应 data 字段
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParseResponse {

    /** 解析出的表信息列表 */
    private List<TableInfo> tables;
}
