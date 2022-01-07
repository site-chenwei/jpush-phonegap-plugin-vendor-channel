var FSUtils = require("./FSUtils");

var ROOT_GRADLE_FILE = "platforms/android/build.gradle";
var APP_GRADLE_FILE = "platforms/android/app/build.gradle";
var CORDOVA_GRADLE_FILE = "platforms/android/CordovaLib/build.gradle";
var PLUGIN_BUILD_GRADLE_FILE = "platforms/android/cordova/lib/plugin-build.gradle";
var REPOSITORIES_GRADLE_ROOT = "platforms/android/repositories.gradle";
var REPOSITORIES_GRADLE_APP = "platforms/android/app/repositories.gradle";
var REPOSITORIES_GRADLE_CORDOVALIB = "platforms/android/CordovaLib/repositories.gradle";
var PUSH_CONFIG_FILE = "push_config.json";
var REPOSITORIES = "ext.repos = {\n" +
    "    mavenCentral()\n" +
    "    maven { url 'https://maven.aliyun.com/repository/public' }\n" +
    "    maven { url 'https://maven.aliyun.com/repository/google' }\n" +
    "    maven { url 'http://developer.huawei.com/repo/' }\n" +
    "}"
COMMENT = "//This line is added by cordova-plugin-hms-push plugin";
var NEW_LINE = "\n";
var pushConfig;
module.exports = function () {
    if (!FSUtils.exists(ROOT_GRADLE_FILE)) {
        console.log("root gradle file does not exist. after_plugin_install script wont be executed.");
        return;
    }
    if (!FSUtils.exists(PUSH_CONFIG_FILE)) {
        console.log("push_config file does not exist. after_plugin_install script wont be executed.");
        return;
    }
    pushConfig = JSON.parse(FSUtils.readFile(PUSH_CONFIG_FILE, "UTF-8"));
    var rootGradleContent = FSUtils.readFile(ROOT_GRADLE_FILE, "UTF-8").toString();
    var lines = rootGradleContent.split(NEW_LINE);
    var depLines = dependence(lines);
    FSUtils.writeFile(ROOT_GRADLE_FILE, depLines.join(NEW_LINE));
    if (FSUtils.exists(REPOSITORIES_GRADLE_APP)) {
        console.warn("当前Cordova-Android版本大于8")
        updateRepositoriesNormal(REPOSITORIES_GRADLE_APP);
        updateRepositoriesNormal(REPOSITORIES_GRADLE_ROOT);
        updateRepositoriesNormal(REPOSITORIES_GRADLE_CORDOVALIB);
        updateRepositories(PLUGIN_BUILD_GRADLE_FILE);
    } else {
        console.warn("当前Cordova-Android版本小于等于8")
        updateRepositories(APP_GRADLE_FILE);
        updateRepositories(CORDOVA_GRADLE_FILE);
        updateRepositories(ROOT_GRADLE_FILE);
    }
    updateAppGradle(APP_GRADLE_FILE);
    copyAGConnect();
};

function updateRepositoriesNormal(file) {
    if (FSUtils.exists(file)) {
        FSUtils.writeFile(file, REPOSITORIES);
    }
}

function dependence(lines) {
    var AG_CONNECT_DEPENDENCY = "        classpath 'com.huawei.agconnect:agcp:1.6.0.300' " + COMMENT;
    var pattern = /(\s*)classpath(\s+)[\',\"]com.android.tools.build:gradle.*[^\]\n]/m;
    var index;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (pattern.test(line)) {
            index = i;
            break;
        }
    }
    lines.splice(index + 1, 0, AG_CONNECT_DEPENDENCY);
    return lines;
}

function updateRepositories(file) {
    if (FSUtils.exists(file)) {
        var lines = FSUtils.readFile(file, "UTF-8").toString().split(NEW_LINE);
        var pattern = /(\s*)classpath(\s+)[\',\"]com.android.tools.build:gradle.*[^\]\n]/m;
        var patternIndex;
        var indexs = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf("repositories {") >= 0) {
                indexs.push(i);
            }
            if (line.indexOf("jcenter()") >= 0) {
                lines[i] = "      maven { url 'https://maven.aliyun.com/repository/public' }";
            }
            if (line.indexOf("google()") >= 0) {
                lines[i] = "        maven { url 'https://maven.aliyun.com/repository/google' } " + NEW_LINE + "        mavenCentral()" + NEW_LINE + "        maven {url 'http://developer.huawei.com/repo/' }";
            }
            if (line.indexOf("mavenCentral()") >= 0) {
                lines[i] = "";
            }
            if (!patternIndex && pattern.test(line)) {
                patternIndex = i;
            }
        }
        lines.splice(patternIndex, 1, "        classpath 'com.android.tools.build:gradle:4.0.2'");
        FSUtils.writeFile(file, lines.join(NEW_LINE));
    }
}

function copyAGConnect() {
    var DEST_DIR = "platforms/android/app/";
    var FILE_NAME = "agconnect-services.json";
    if (!FSUtils.exists(FILE_NAME)) {
        console.log("agconnect-services.json does not exists!");
        return;
    }

    if (!FSUtils.exists(DEST_DIR)) {
        console.log("destination does not exist. dest : " + DEST_DIR);
        return;
    }

    FSUtils.copyFile(FILE_NAME, DEST_DIR + FILE_NAME);
}

function updateAppGradle(file) {
    if (FSUtils.exists(file)) {
        var lines = FSUtils.readFile(file, "UTF-8").toString().split(NEW_LINE);
        var index;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!index && line.indexOf("implementation") >= 0) {
                index = i;
            }
            if (line.indexOf("defaultConfig {") >= 0) {
                lines[i] = lines[i] + NEW_LINE + "        applicationId \"" + pushConfig.applicationId + "\"\n" +
                    "        ndk {\n" +
                    "            //选择要添加的对应 cpu 类型的 .so 库。\n" +
                    "            abiFilters 'armeabi', 'armeabi-v7a', 'arm64-v8a'\n" +
                    "        }\n" +
                    "        manifestPlaceholders = [\n" +
                    "                JPUSH_PKGNAME : '" + pushConfig.applicationId + "',\n" +
                    "                JPUSH_APPKEY  : '" + pushConfig.JPUSH_APPKEY + "',\n" +
                    "                JPUSH_CHANNEL : '" + pushConfig.JPUSH_CHANNEL + "',\n" +
                    "                XIAOMI_APPID  : '" + pushConfig.XIAOMI_APPID + "',\n" +
                    "                XIAOMI_APPKEY : '" + pushConfig.XIAOMI_APPKEY + "',\n" +
                    "                OPPO_APPKEY   : '" + pushConfig.OPPO_APPKEY + "',\n" +
                    "                OPPO_APPID    : '" + pushConfig.OPPO_APPID + "',\n" +
                    "                OPPO_APPSECRET: '" + pushConfig.OPPO_APPSECRET + "',\n" +
                    "                VIVO_APPKEY   : '" + pushConfig.VIVO_APPKEY + "',\n" +
                    "                VIVO_APPID    : '" + pushConfig.VIVO_APPID + "'\n" +
                    "        ]\n";
            }
        }
        if (index) {
            lines.splice(index, 0, "        implementation 'cn.jiguang.sdk:jcore:2.9.0'  \n" +
                "       implementation 'cn.jiguang.sdk:jpush:4.3.0'  \n" +
                "       implementation 'com.huawei.hms:push:6.1.0.300'\n" +
                "       implementation 'cn.jiguang.sdk.plugin:huawei:4.3.0'\n" +
                "       implementation 'cn.jiguang.sdk.plugin:xiaomi:4.3.0' \n"
            );
        }
        lines.splice(lines.length - 1, 0, "apply plugin: 'com.huawei.agconnect' // ADD THIS AT THE TOP");
        FSUtils.writeFile(file, lines.join(NEW_LINE));
    }
}
