# Content Optimization Scripts

Automatic generation of video and image variants for optimal display performance across different modes.

## Quick Setup

1. **Install dependencies:**
   ```bash
   # macOS
   brew install ffmpeg imagemagick jq
   
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg imagemagick jq
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x optimize-content.sh install-cron.sh
   ```

3. **Set up automatic nightly optimization:**
   ```bash
   ./install-cron.sh
   ```

## Manual Usage

```bash
# Run optimization once
./optimize-content.sh

# Test with a specific directory
./optimize-content.sh /path/to/specific/project
```

## Generated Variants

### For each `video.mp4`, creates:
- `video-sm.mp4` - 854x480, CRF 28 (Grid mode)
- `video-md.mp4` - 1280x720, CRF 25 (Paths/Carousel)  
- `video-lg.mp4` - 1920x1080, CRF 22 (High quality)

### For each `image.jpg`, creates:
- `image-sm.jpg` - 854x480, 82% quality (Grid mode)
- `image-md.jpg` - 1280x720, 87% quality (General display)
- `image-lg.jpg` - 1920x1080, 92% quality (Detailed viewing)

## Configuration

Edit `config.json` to customize:
- Quality settings (CRF for video, quality % for images)
- Resolution targets
- Processing behavior
- File type support

## Mode Mapping

| Display Mode | Variant Used | Quality Focus |
|--------------|--------------|---------------|
| Slideshow | `original` | Maximum quality for 4K TV |
| Grid | `sm` | Performance with many items |
| Paths | `md` | Balanced quality/performance |
| VerticalCarousel | `md` | Smooth scrolling |
| Mosaic | `md` | Multi-item display |

## Logs

- **Optimization logs:** `../logs/optimization.log`
- **Cron logs:** `../logs/cron.log`  
- **Last run timestamp:** `.last-run`

## Performance

- **Smart processing:** Only processes new/changed files
- **Size optimization:** Typically 60-80% file size reduction
- **Background operation:** Runs independently of app
- **Failsafe:** Skips files smaller than target resolution

## Troubleshooting

### Dependencies
```bash
# Check if tools are installed
command -v ffmpeg && echo "✅ ffmpeg" || echo "❌ ffmpeg missing"
command -v convert && echo "✅ imagemagick" || echo "❌ imagemagick missing"  
command -v jq && echo "✅ jq" || echo "❌ jq missing"
```

### Disk Space
Monitor disk usage as variants will increase storage:
```bash
# Check disk usage in content folder
du -sh ../projects ../posters
```

### Manual Cleanup
Remove all variants to start fresh:
```bash
# WARNING: This removes all generated variants
find ../projects ../posters -name "*-sm.*" -delete
find ../projects ../posters -name "*-md.*" -delete  
find ../projects ../posters -name "*-lg.*" -delete
```

## Advanced Usage

### Custom Quality Settings
Edit `config.json` video CRF values:
- **Lower CRF = Higher quality, larger files** (18-22)
- **Higher CRF = Lower quality, smaller files** (24-32)

### Process Specific Directory
```bash
./optimize-content.sh "../projects/specific-project"
```

### Check What Would Be Processed
```bash
# Dry run (requires script modification to add --dry-run flag)
# Shows what files would be processed without doing it
``` 