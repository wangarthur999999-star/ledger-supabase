# Capacitor 项目通用 ProGuard / R8 规则。
# 配合 build.gradle 中 minifyEnabled true 使用。

# Capacitor 通过反射调用 plugin 类, 必须保留
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclasseswithmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}

# WebView <-> JS bridge: 保留 JavascriptInterface 注解和被注解的成员
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 保留行号信息, 方便看 release 崩溃 stacktrace 时定位
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Cordova 插件 (Capacitor 兼容层) 也走反射
-keep class org.apache.cordova.** { *; }
-keep class org.apache.cordova.CordovaPlugin
