package com.bang.sqltoerbangback.service;

import com.bang.sqltoerbangback.model.dto.ExampleResponse;
import com.bang.sqltoerbangback.model.dto.ParseResponse;

/**
 * SQL 解析服务接口
 */
public interface ParseService {

    /**
     * 解析 SQL 建表语句
     *
     * @param sql SQL 文本（一条或多条 CREATE TABLE）
     * @return 解析结果
     */
    ParseResponse parse(String sql);

    /**
     * 获取示例 SQL
     *
     * @return 示例 SQL 及其元信息
     */
    ExampleResponse getExample();
}
