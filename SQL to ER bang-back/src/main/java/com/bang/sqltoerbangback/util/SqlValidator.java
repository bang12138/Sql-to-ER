package com.bang.sqltoerbangback.util;

/**
 * SQL 校验工具类
 */
public final class SqlValidator {

    /** SQL 最大长度：100KB */
    public static final int MAX_SQL_LENGTH = 102400;

    private SqlValidator() {
    }

    /**
     * 校验 SQL 文本是否为空
     */
    public static boolean isBlank(String sql) {
        return sql == null || sql.isBlank();
    }

    /**
     * 校验 SQL 文本是否过长
     */
    public static boolean isTooLong(String sql) {
        return sql != null && sql.length() > MAX_SQL_LENGTH;
    }

    /**
     * 获取 SQL 实际长度
     */
    public static int getLength(String sql) {
        return sql == null ? 0 : sql.length();
    }

    /**
     * 去除 SQL 中的反引号和双引号包裹的表名/列名
     */
    public static String stripQuotes(String name) {
        if (name == null) {
            return null;
        }
        String stripped = name.trim();
        if ((stripped.startsWith("`") && stripped.endsWith("`"))
                || (stripped.startsWith("\"") && stripped.endsWith("\""))) {
            stripped = stripped.substring(1, stripped.length() - 1);
        }
        return stripped;
    }
}
