#!/bin/bash

# 扫榜助手发布打包脚本
# 用途：将编译好的文件打包成可分发的格式

echo "📦 扫榜助手发布打包脚本"
echo "========================"

# 设置版本号
VERSION="1.0.0"
DIST_DIR="dist_release"

# 创建分发目录
echo "创建分发目录..."
rm -rf $DIST_DIR
mkdir -p $DIST_DIR

# 复制 macOS DMG
echo "复制 macOS 安装包..."
cp src-tauri/target/release/bundle/dmg/扫榜助手_${VERSION}_aarch64.dmg $DIST_DIR/

# 复制文档
echo "复制文档..."
cp 发布指南.md $DIST_DIR/
cp 扫榜助手_安装使用说明.docx $DIST_DIR/ 2>/dev/null || echo "注意：安装说明文档不存在，跳过"

# 显示结果
echo ""
echo "✅ 打包完成！"
echo ""
echo "分发目录：$DIST_DIR/"
echo "文件列表："
ls -lh $DIST_DIR/

# 创建压缩包（可选）
echo ""
read -p "是否创建压缩包？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    zip -r 扫榜助手_v${VERSION}_macOS.zip $DIST_DIR/
    echo ""
    echo "✅ 压缩包已创建：扫榜助手_v${VERSION}_macOS.zip"
fi

echo ""
echo "📝 下一步："
echo "1. 将 $DIST_DIR 目录中的文件上传到网盘"
echo "2. 推送代码到 GitHub 并打 tag，等待 Windows 版本编译"
echo "3. 在小红书发布更新通知"
