#!/bin/bash

# Generate platform-specific icons from icon_macos.png
# Usage: ./scripts/generate-icons.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/assets"
SOURCE_ICON="$ASSETS_DIR/icon_macos.png"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Icon Generator for CodaJS"
echo "========================================"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}Error: Source icon not found at $SOURCE_ICON${NC}"
    exit 1
fi

# Detect OS
OS="$(uname -s)"
echo -e "Detected OS: ${YELLOW}$OS${NC}"

# Function to generate macOS .icns
generate_icns() {
    echo -e "\n${GREEN}Generating macOS .icns...${NC}"
    
    ICONSET_DIR="$ASSETS_DIR/icon.iconset"
    rm -rf "$ICONSET_DIR"
    mkdir -p "$ICONSET_DIR"
    
    # Generate all required sizes
    sips -z 16 16 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null
    sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null
    sips -z 32 32 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null
    sips -z 64 64 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null
    sips -z 128 128 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null
    sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null
    sips -z 256 256 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null
    sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null
    sips -z 512 512 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null
    cp "$SOURCE_ICON" "$ICONSET_DIR/icon_512x512@2x.png"
    
    # Convert to .icns
    iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns"
    
    # Cleanup
    rm -rf "$ICONSET_DIR"
    
    echo -e "${GREEN}Created: $ASSETS_DIR/icon.icns${NC}"
}

# Function to generate Windows .ico
generate_ico() {
    echo -e "\n${GREEN}Generating Windows .ico...${NC}"
    
    # Check if ImageMagick is available
    if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
        echo -e "${YELLOW}Warning: ImageMagick not found. Skipping .ico generation.${NC}"
        echo "Install with: brew install imagemagick (macOS) or apt install imagemagick (Linux)"
        return
    fi
    
    # Use magick if available, otherwise convert
    MAGICK_CMD="magick"
    if ! command -v magick &> /dev/null; then
        MAGICK_CMD="convert"
    fi
    
    # Generate .ico with multiple sizes
    $MAGICK_CMD "$SOURCE_ICON" \
        -define icon:auto-resize=256,128,64,48,32,16 \
        "$ASSETS_DIR/icon.ico"
    
    echo -e "${GREEN}Created: $ASSETS_DIR/icon.ico${NC}"
}

# Function to generate Linux icons
generate_linux() {
    echo -e "\n${GREEN}Generating Linux icons...${NC}"
    
    LINUX_DIR="$ASSETS_DIR/linux"
    mkdir -p "$LINUX_DIR"
    
    # Check for resize tool
    if command -v magick &> /dev/null; then
        RESIZE_CMD="magick"
    elif command -v convert &> /dev/null; then
        RESIZE_CMD="convert"
    elif command -v sips &> /dev/null; then
        RESIZE_CMD="sips"
    else
        echo -e "${YELLOW}Warning: No resize tool found. Copying source icon only.${NC}"
        cp "$SOURCE_ICON" "$LINUX_DIR/icon_512x512.png"
        return
    fi
    
    # Generate standard Linux icon sizes
    SIZES=(16 24 32 48 64 128 256 512)
    
    for SIZE in "${SIZES[@]}"; do
        if [ "$RESIZE_CMD" = "sips" ]; then
            sips -z $SIZE $SIZE "$SOURCE_ICON" --out "$LINUX_DIR/icon_${SIZE}x${SIZE}.png" > /dev/null
        else
            $RESIZE_CMD "$SOURCE_ICON" -resize ${SIZE}x${SIZE} "$LINUX_DIR/icon_${SIZE}x${SIZE}.png"
        fi
    done
    
    # Copy main icon
    cp "$SOURCE_ICON" "$ASSETS_DIR/icon.png"
    
    echo -e "${GREEN}Created: $ASSETS_DIR/linux/ (multiple sizes)${NC}"
    echo -e "${GREEN}Created: $ASSETS_DIR/icon.png${NC}"
}

# Main execution based on OS
case "$OS" in
    Darwin)
        # macOS - generate all formats
        generate_icns
        generate_ico
        generate_linux
        ;;
    Linux)
        # Linux - generate Linux and Windows formats
        generate_linux
        generate_ico
        echo -e "${YELLOW}Note: .icns generation requires macOS${NC}"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        # Windows - generate Windows and Linux formats
        generate_ico
        generate_linux
        echo -e "${YELLOW}Note: .icns generation requires macOS${NC}"
        ;;
    *)
        echo -e "${RED}Unknown OS: $OS${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}========================================"
echo "  Icon generation complete!"
echo "========================================${NC}"
