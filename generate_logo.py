#!/usr/bin/env python3
"""
生成扫榜助手应用图标
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_logo(size=1024):
    """创建Logo"""
    # 创建透明背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 尺寸比例
    scale = size / 512
    center = size / 2
    
    # 绘制圆形背景（渐变效果）
    for i in range(240, 0, -1):
        # 从外到内的渐变
        ratio = i / 240
        r = int(255 - ratio * (255 - 255))  # FF
        g = int(107 + ratio * (160 - 107))  # 6B -> A0
        b = int(107 + ratio * (122 - 107))  # 6B -> 7A
        draw.ellipse(
            [center - i * scale, center - i * scale, 
             center + i * scale, center + i * scale],
            fill=(r, g, b, 255)
        )
    
    # 书本尺寸
    book_width = 220 * scale
    book_height = 260 * scale
    book_x = center - book_width / 2
    book_y = center - book_height / 2 + 20 * scale
    
    # 绘制书本阴影
    shadow_offset = 8 * scale
    draw.rounded_rectangle(
        [book_x + shadow_offset, book_y + shadow_offset,
         book_x + book_width + shadow_offset, book_y + book_height + shadow_offset],
        radius=10 * scale,
        fill=(0, 0, 0, 40)
    )
    
    # 绘制书本主体（白色）
    draw.rounded_rectangle(
        [book_x, book_y, book_x + book_width, book_y + book_height],
        radius=10 * scale,
        fill=(255, 255, 255, 255)
    )
    
    # 绘制书脊
    spine_width = 25 * scale
    draw.rounded_rectangle(
        [book_x, book_y, book_x + spine_width, book_y + book_height],
        radius=10 * scale,
        fill=(230, 230, 230, 255)
    )
    
    # 绘制书页分隔线
    line_x = book_x + 50 * scale
    for y_offset in [40, 70, 100, 130, 160]:
        line_y = book_y + y_offset * scale
        draw.line(
            [line_x, line_y, line_x + 80 * scale, line_y],
            fill=(220, 220, 220, 255),
            width=int(2 * scale)
        )
    
    # 绘制"爆款"文字
    try:
        # 尝试使用系统中文字体
        font_size = int(48 * scale)
        font_paths = [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/Hiragino Sans GB.ttc"
        ]
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break
        
        if font is None:
            # 如果没有找到中文字体，使用默认字体
            font = ImageFont.load_default()
        
        text = "爆款"
        # 计算文字位置（居中）
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = book_x + book_width - 110 * scale
        text_y = book_y + book_height / 2 - text_height / 2 - 20 * scale
        
        # 绘制文字
        draw.text(
            (text_x, text_y),
            text,
            font=font,
            fill=(255, 107, 107, 255)  # 珊瑚红色
        )
    except Exception as e:
        print(f"文字绘制失败: {e}")
    
    # 绘制书签（黄色）
    bookmark_x = book_x + book_width - 40 * scale
    bookmark_y = book_y
    bookmark_width = 25 * scale
    bookmark_height = 60 * scale
    
    draw.polygon(
        [
            (bookmark_x, bookmark_y),
            (bookmark_x + bookmark_width, bookmark_y),
            (bookmark_x + bookmark_width, bookmark_y + bookmark_height),
            (bookmark_x + bookmark_width/2, bookmark_y + bookmark_height - 15*scale),
            (bookmark_x, bookmark_y + bookmark_height)
        ],
        fill=(255, 217, 61, 255)  # 金黄色
    )
    
    return img

def main():
    """生成各种尺寸的图标"""
    output_dir = "/Users/shine/WorkBuddy/20260323091130/novel-material-collector/src-tauri/icons"
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
    public_dir = "/Users/shine/WorkBuddy/20260323091130/novel-material-collector/public"
    img = create_logo(512)
    img.save(os.path.join(public_dir, 'icon.png'))
    
    print("✅ 所有图标已生成！")
    print(f"保存位置: {output_dir}")

if __name__ == "__main__":
    main()
