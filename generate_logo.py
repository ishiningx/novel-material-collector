#!/usr/bin/env python3
"""
生成素材收集助手应用图标
"""
from PIL import Image, ImageDraw
import os
import math

def create_logo(size=1024):
    """创建Logo"""
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 尺寸比例
    scale = size / 512
    center = size / 2
    
    # 绘制圆形背景（青瓷蓝渐变）
    primary = (44, 95, 110)  # #2C5F6E
    primary_light = (58, 125, 142)  # #3A7D8E
    for i in range(240, 0, -1):
        ratio = i / 240
        r = int(primary_light[0] + ratio * (primary[0] - primary_light[0]))
        g = int(primary_light[1] + ratio * (primary[1] - primary_light[1]))
        b = int(primary_light[2] + ratio * (primary[2] - primary_light[2]))
        draw.ellipse(
            [center - i * scale, center - i * scale,
             center + i * scale, center + i * scale],
            fill=(r, g, b, 255)
        )
    
    # 书本尺寸
    book_width = 210 * scale
    book_height = 240 * scale
    book_x = center - book_width / 2
    book_y = center - book_height / 2 + 20 * scale
    
    # 绘制书本阴影
    shadow_offset = 6 * scale
    draw.rounded_rectangle(
        [book_x + shadow_offset, book_y + shadow_offset,
         book_x + book_width + shadow_offset, book_y + book_height + shadow_offset],
        radius=10 * scale,
        fill=(0, 0, 0, 30)
    )
    
    # 绘制书本主体（白色）
    draw.rounded_rectangle(
        [book_x, book_y, book_x + book_width, book_y + book_height],
        radius=10 * scale,
        fill=(255, 255, 255, 255)
    )
    
    # 绘制书脊（浅青瓷色）
    spine_width = 22 * scale
    draw.rounded_rectangle(
        [book_x, book_y, book_x + spine_width, book_y + book_height],
        radius=10 * scale,
        fill=(209, 233, 239, 255)  # #D1E9EF
    )
    
    # 绘制书页分隔线
    line_x = book_x + 36 * scale
    for y_offset in [28, 56, 84]:
        line_y = book_y + y_offset * scale
        draw.line(
            [line_x, line_y, line_x + 78 * scale, line_y],
            fill=(226, 232, 240, 255),  # #E2E8F0
            width=int(2 * scale)
        )
    
    # 绘制收藏星标（暖琥珀色）
    star_center_x = book_x + book_width - 60 * scale
    star_center_y = book_y + book_height * 0.42
    star_radius = 24 * scale
    
    # 画五角星
    inner_r = star_radius * 0.38
    outer_r = star_radius
    star_points = []
    for i in range(5):
        outer_angle = -90 + i * 72
        inner_angle = -90 + i * 72 + 36
        star_points.append((
            star_center_x + outer_r * math.cos(math.radians(outer_angle)),
            star_center_y + outer_r * math.sin(math.radians(outer_angle))
        ))
        star_points.append((
            star_center_x + inner_r * math.cos(math.radians(inner_angle)),
            star_center_y + inner_r * math.sin(math.radians(inner_angle))
        ))
    
    draw.polygon(star_points, fill=(217, 119, 6, 230))  # #D97706
    
    # 绘制书签（暖琥珀色）
    bookmark_x = book_x + book_width - 36 * scale
    bookmark_y = book_y
    bookmark_width = 22 * scale
    bookmark_height = 55 * scale
    
    draw.polygon(
        [
            (bookmark_x, bookmark_y),
            (bookmark_x + bookmark_width, bookmark_y),
            (bookmark_x + bookmark_width, bookmark_y + bookmark_height),
            (bookmark_x + bookmark_width / 2, bookmark_y + bookmark_height - 14 * scale),
            (bookmark_x, bookmark_y + bookmark_height)
        ],
        fill=(217, 119, 6, 255)  # #D97706
    )
    
    return img

def main():
    """生成各种尺寸的图标"""
    output_dir = "/Users/shine/Qoder/novel-material-collector/src-tauri/icons"
    os.makedirs(output_dir, exist_ok=True)
    
    sizes = {
        '32x32.png': 32,
        '128x128.png': 128,
        '128x128@2x.png': 256,
        '256x256@2x.png': 512,
        'icon.png': 512
    }
    
    for filename, size in sizes.items():
        print(f"生成 {filename} ({size}x{size})...")
        img = create_logo(size)
        img.save(os.path.join(output_dir, filename))
    
    # 同时保存到 public 目录
    public_dir = "/Users/shine/Qoder/novel-material-collector/public"
    img = create_logo(512)
    img.save(os.path.join(public_dir, 'icon.png'))
    
    # 保存 1024x1024 源图供 tauri icon 使用
    img_src = create_logo(1024)
    img_src.save(os.path.join(output_dir, 'icon_1024x1024.png'))
    
    print("✅ 所有图标已生成！")
    print(f"保存位置: {output_dir}")

if __name__ == "__main__":
    main()
