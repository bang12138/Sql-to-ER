package com.bang.sqltoerbangback.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GET /api/health 响应 data 字段
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HealthResponse {

    /** 服务状态 */
    private String status;

    /** 版本号 */
    private String version;

    /** 运行时长 */
    private String uptime;
}
