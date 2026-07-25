package com.bang.sqltoerbangback.exception;

import lombok.Getter;

/**
 * 业务异常
 */
@Getter
public class BizException extends RuntimeException {

    /** 业务错误码 */
    private final int code;

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BizException(int code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    // ========== 预定义工厂 ==========

    /** SQL 语句为空 */
    public static BizException sqlEmpty() {
        return new BizException(40001, "SQL 语句不能为空");
    }

    /** SQL 语句过长 */
    public static BizException sqlTooLong(int actualSize) {
        return new BizException(40002, "SQL 语句过长，最大支持 100KB");
    }

    /** SQL 语法错误 */
    public static BizException sqlSyntaxError(String detail) {
        return new BizException(40003, "SQL 语法错误：" + detail);
    }

    /** 不包含有效 CREATE TABLE */
    public static BizException noCreateTable() {
        return new BizException(40004, "未检测到有效的 CREATE TABLE 语句");
    }
}
