package com.bang.sqltoerbangback.controller;

import com.bang.sqltoerbangback.model.ApiResponse;
import com.bang.sqltoerbangback.model.dto.ExampleResponse;
import com.bang.sqltoerbangback.model.dto.HealthResponse;
import com.bang.sqltoerbangback.model.dto.ParseRequest;
import com.bang.sqltoerbangback.model.dto.ParseResponse;
import com.bang.sqltoerbangback.service.ParseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;

/**
 * SQL 解析相关接口
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "SQL 解析", description = "SQL 建表语句解析相关接口")
public class ParseController {

    private final ParseService parseService;

    /** 服务启动时间 */
    private static final long START_TIME = ManagementFactory.getRuntimeMXBean().getStartTime();

    @PostMapping("/parse")
    @Operation(summary = "解析 SQL 建表语句", description = "接收 SQL CREATE TABLE 文本，返回结构化的表信息")
    public ApiResponse<ParseResponse> parse(@Valid @RequestBody ParseRequest request) {
        ParseResponse result = parseService.parse(request.getSql());
        return ApiResponse.success("解析成功", result);
    }

    @GetMapping("/example")
    @Operation(summary = "获取示例 SQL", description = "返回预置的示例建表语句")
    public ApiResponse<ExampleResponse> getExample() {
        ExampleResponse result = parseService.getExample();
        return ApiResponse.success(result);
    }

    @GetMapping("/health")
    @Operation(summary = "健康检查", description = "检查服务运行状态")
    public ApiResponse<HealthResponse> health() {
        long uptimeMillis = System.currentTimeMillis() - START_TIME;
        long hours = uptimeMillis / 3600000;
        long minutes = (uptimeMillis % 3600000) / 60000;
        long seconds = (uptimeMillis % 60000) / 1000;
        String uptime = String.format("%dh %dm %ds", hours, minutes, seconds);

        HealthResponse data = new HealthResponse("UP", "1.0.0", uptime);
        return ApiResponse.success("服务运行正常", data);
    }
}
