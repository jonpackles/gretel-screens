#!/bin/bash

# Content Optimization Script for Gretel Screens
# Generates variants for videos and images
# Designed to run nightly via cron

set -euo pipefail  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$CONTENT_ROOT/logs/optimization.log"
LAST_RUN_FILE="$SCRIPT_DIR/.last-run"
CONFIG_FILE="$SCRIPT_DIR/config.json"

# Create directories if they don't exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$SCRIPT_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        # Parse JSON config (requires jq)
        VIDEO_QUALITY_SM=$(jq -r '.video.small.crf // 28' "$CONFIG_FILE")
        VIDEO_QUALITY_MD=$(jq -r '.video.medium.crf // 25' "$CONFIG_FILE")
        VIDEO_QUALITY_LG=$(jq -r '.video.large.crf // 22' "$CONFIG_FILE")
        IMAGE_QUALITY=$(jq -r '.image.quality // 85' "$CONFIG_FILE")
        PROCESS_SUBDIRS=$(jq -r '.processSubdirectories // true' "$CONFIG_FILE")
    else
        # Default values
        VIDEO_QUALITY_SM=28
        VIDEO_QUALITY_MD=25
        VIDEO_QUALITY_LG=22
        IMAGE_QUALITY=85
        PROCESS_SUBDIRS=true
        
        # Create default config
        create_default_config
    fi
}

# Create default configuration file
create_default_config() {
    cat > "$CONFIG_FILE" << EOF
{
  "video": {
    "small": {
      "width": 854,
      "height": 480,
      "crf": 28,
      "preset": "medium"
    },
    "medium": {
      "width": 1280,
      "height": 720,
      "crf": 25,
      "preset": "medium"
    },
    "large": {
      "width": 1920,
      "height": 1080,
      "crf": 22,
      "preset": "medium"
    }
  },
  "image": {
    "small": {
      "width": 854,
      "height": 480,
      "quality": 85
    },
    "medium": {
      "width": 1280,
      "height": 720,
      "quality": 88
    },
    "large": {
      "width": 1920,
      "height": 1080,
      "quality": 92
    }
  },
  "processSubdirectories": true,
  "skipExisting": true,
  "fileTypes": {
    "video": ["mp4", "mov", "avi", "mkv"],
    "image": ["jpg", "jpeg", "png", "tiff", "webp"]
  }
}
EOF
    log "Created default configuration: $CONFIG_FILE"
}

# Check dependencies
check_dependencies() {
    local missing=()
    
    command -v ffmpeg >/dev/null 2>&1 || missing+=("ffmpeg")
    command -v convert >/dev/null 2>&1 || missing+=("imagemagick")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log "ERROR: Missing dependencies: ${missing[*]}"
        log "Install with: brew install ffmpeg imagemagick jq"
        exit 1
    fi
}

# Check if file needs processing (newer than last run)
needs_processing() {
    local file="$1"
    
    if [[ ! -f "$LAST_RUN_FILE" ]]; then
        return 0  # First run, process everything
    fi
    
    local last_run=$(cat "$LAST_RUN_FILE" 2>/dev/null || echo "0")
    local file_time=$(stat -f "%m" "$file" 2>/dev/null || echo "0")
    
    [[ $file_time -gt $last_run ]]
}

# Generate video variants
process_video() {
    local input="$1"
    local base="${input%.*}"
    local ext="${input##*.}"
    
    local variants=(
        "sm:854:480:$VIDEO_QUALITY_SM"
        "md:1280:720:$VIDEO_QUALITY_MD" 
        "lg:1920:1080:$VIDEO_QUALITY_LG"
    )
    
    for variant in "${variants[@]}"; do
        IFS=':' read -r size width height crf <<< "$variant"
        local output="${base}-${size}.${ext}"
        
        if [[ -f "$output" ]] && ! needs_processing "$input"; then
            log "SKIP: $output (already exists)"
            continue
        fi
        
        log "PROCESSING: Creating $size variant - $output"
        
        # Get input video dimensions
        local input_width=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width -of csv=p=0 "$input")
        local input_height=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=height -of csv=p=0 "$input")
        
        # Skip if input is smaller than target
        if [[ $input_width -lt $width ]] || [[ $input_height -lt $height ]]; then
            log "SKIP: $output (input smaller than target)"
            continue
        fi
        
        # Create variant with progress
        if ffmpeg -i "$input" \
            -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2" \
            -c:v libx264 -crf "$crf" -preset medium \
            -c:a aac -b:a 128k \
            -movflags +faststart \
            -y "$output" 2>/dev/null; then
            
            local input_size=$(stat -f "%z" "$input")
            local output_size=$(stat -f "%z" "$output")
            local reduction=$((100 - (output_size * 100 / input_size)))
            
            log "SUCCESS: $output (${reduction}% size reduction)"
        else
            log "ERROR: Failed to create $output"
        fi
    done
}

# Generate image variants
process_image() {
    local input="$1"
    local base="${input%.*}"
    local ext="${input##*.}"
    
    local variants=(
        "sm:854x480:85"
        "md:1280x720:88"
        "lg:1920x1080:92"
    )
    
    for variant in "${variants[@]}"; do
        IFS=':' read -r size dimensions quality <<< "$variant"
        local output="${base}-${size}.${ext}"
        
        if [[ -f "$output" ]] && ! needs_processing "$input"; then
            log "SKIP: $output (already exists)"
            continue
        fi
        
        log "PROCESSING: Creating $size variant - $output"
        
        # Create variant with ImageMagick
        if convert "$input" \
            -resize "${dimensions}>" \
            -quality "$quality" \
            -strip \
            "$output" 2>/dev/null; then
            
            local input_size=$(stat -f "%z" "$input")
            local output_size=$(stat -f "%z" "$output")
            local reduction=$((100 - (output_size * 100 / input_size)))
            
            log "SUCCESS: $output (${reduction}% size reduction)"
        else
            log "ERROR: Failed to create $output"
        fi
    done
}

# Check if file is a variant (has size suffix)
is_variant() {
    local filename="$1"
    [[ "$filename" =~ --(sm|md|lg|xl|small|medium|large|thumb)\. ]]
}

# Process directory
process_directory() {
    local dir="$1"
    local files_processed=0
    
    log "SCANNING: $dir"
    
    # Process video files
    while IFS= read -r -d '' file; do
        if ! is_variant "$(basename "$file")"; then
            process_video "$file"
            ((files_processed++))
        fi
    done < <(find "$dir" -maxdepth 1 -type f \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.avi" \) -print0 2>/dev/null || true)
    
    # Process image files  
    while IFS= read -r -d '' file; do
        if ! is_variant "$(basename "$file")"; then
            process_image "$file"
            ((files_processed++))
        fi
    done < <(find "$dir" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -print0 2>/dev/null || true)
    
    if [[ $files_processed -gt 0 ]]; then
        log "COMPLETED: $dir ($files_processed files processed)"
    fi
}

# Main execution
main() {
    log "========================================="
    log "Starting content optimization"
    log "Content root: $CONTENT_ROOT"
    
    # Load configuration and check dependencies
    load_config
    check_dependencies
    
    local total_processed=0
    
    # Process main directories
    for content_dir in "projects" "posters"; do
        local full_path="$CONTENT_ROOT/$content_dir"
        
        if [[ ! -d "$full_path" ]]; then
            log "SKIP: Directory not found - $full_path"
            continue
        fi
        
        if [[ "$PROCESS_SUBDIRS" == "true" ]]; then
            # Process each subdirectory
            find "$full_path" -type d -mindepth 1 | while read -r subdir; do
                process_directory "$subdir"
            done
        else
            # Process only top level
            process_directory "$full_path"
        fi
    done
    
    # Update last run timestamp
    date +%s > "$LAST_RUN_FILE"
    
    log "Optimization completed"
    log "========================================="
}

# Run main function
main "$@" 