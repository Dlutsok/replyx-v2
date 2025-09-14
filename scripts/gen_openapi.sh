#!/bin/bash

# Script: Generate OpenAPI Specification from FastAPI
# Author: RAD Agent
# Date: 2025-09-14
# Purpose: Export OpenAPI JSON specification from ReplyX FastAPI backend

set -e  # Exit on any error

# Configuration
BACKEND_DIR="../backend"
OUTPUT_FILE="../docs/api/openapi.json"
PYTHON_EXEC="python3"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}[INFO]${NC} Starting OpenAPI generation for ReplyX..."

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}[ERROR]${NC} Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if main.py exists
if [ ! -f "$BACKEND_DIR/main.py" ]; then
    echo -e "${RED}[ERROR]${NC} main.py not found in backend directory"
    exit 1
fi

# Check Python availability
if ! command -v $PYTHON_EXEC &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Python3 not found in PATH"
    exit 1
fi

# Change to backend directory
cd "$BACKEND_DIR"

echo -e "${YELLOW}[INFO]${NC} Changed to backend directory: $(pwd)"

# Check if virtual environment is available and activate if needed
if [ -d "venv" ]; then
    echo -e "${YELLOW}[INFO]${NC} Activating virtual environment..."
    source venv/bin/activate
elif [ -d "../venv" ]; then
    echo -e "${YELLOW}[INFO]${NC} Activating virtual environment from parent directory..."
    source ../venv/bin/activate
else
    echo -e "${YELLOW}[WARNING]${NC} No virtual environment found, using system Python"
fi

# Check required packages
echo -e "${YELLOW}[INFO]${NC} Checking required packages..."
if ! $PYTHON_EXEC -c "import fastapi, uvicorn" 2>/dev/null; then
    echo -e "${RED}[ERROR]${NC} Required packages (fastapi, uvicorn) not installed"
    echo "Please install dependencies: pip install -r requirements.txt"
    exit 1
fi

# Create temporary script to extract OpenAPI spec
cat > /tmp/extract_openapi.py << 'EOF'
#!/usr/bin/env python3
"""
Temporary script to extract OpenAPI specification from FastAPI app
"""
import sys
import json
import os

# Add backend directory to Python path
sys.path.insert(0, os.getcwd())

try:
    # Import the FastAPI app
    from main import app

    # Generate OpenAPI specification
    openapi_spec = app.openapi()

    # Pretty print JSON with proper formatting
    print(json.dumps(openapi_spec, indent=2, ensure_ascii=False))

except ImportError as e:
    print(f"Error importing FastAPI app: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error generating OpenAPI spec: {e}", file=sys.stderr)
    sys.exit(1)
EOF

echo -e "${YELLOW}[INFO]${NC} Generating OpenAPI specification..."

# Run the extraction script and save output
if $PYTHON_EXEC /tmp/extract_openapi.py > "$OUTPUT_FILE" 2>/dev/null; then
    echo -e "${GREEN}[SUCCESS]${NC} OpenAPI specification generated successfully!"

    # Validate JSON format
    if python3 -m json.tool "$OUTPUT_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} Generated JSON is valid"
    else
        echo -e "${RED}[ERROR]${NC} Generated JSON is invalid"
        exit 1
    fi

    # Show file size and info
    file_size=$(stat -c%s "$OUTPUT_FILE" 2>/dev/null || stat -f%z "$OUTPUT_FILE" 2>/dev/null)
    echo -e "${GREEN}[INFO]${NC} Output file: $OUTPUT_FILE"
    echo -e "${GREEN}[INFO]${NC} File size: ${file_size} bytes"

    # Extract some basic info from the generated spec
    echo -e "${YELLOW}[INFO]${NC} API Information:"
    python3 -c "
import json
with open('$OUTPUT_FILE') as f:
    spec = json.load(f)
    info = spec.get('info', {})
    print(f'  Title: {info.get(\"title\", \"Unknown\")}')
    print(f'  Version: {info.get(\"version\", \"Unknown\")}')
    print(f'  Endpoints: {len(spec.get(\"paths\", {}))}')
    print(f'  Components: {len(spec.get(\"components\", {}).get(\"schemas\", {}))}')
"

else
    echo -e "${RED}[ERROR]${NC} Failed to generate OpenAPI specification"
    echo -e "${YELLOW}[INFO]${NC} Trying to get error details..."
    $PYTHON_EXEC /tmp/extract_openapi.py
    exit 1
fi

# Clean up temporary script
rm -f /tmp/extract_openapi.py

# Create a simple human-readable summary
SUMMARY_FILE="../docs/api/openapi_summary.md"
cat > "$SUMMARY_FILE" << EOF
# OpenAPI Specification Summary

**Generated:** $(date)
**Source:** \`backend/main.py\`
**Output:** \`docs/api/openapi.json\`

## Quick Stats

$(python3 -c "
import json
with open('$OUTPUT_FILE') as f:
    spec = json.load(f)
    info = spec.get('info', {})
    paths = spec.get('paths', {})
    components = spec.get('components', {})

    print(f'- **API Title:** {info.get(\"title\", \"ReplyX API\")}')
    print(f'- **Version:** {info.get(\"version\", \"1.0.0\")}')
    print(f'- **Total Endpoints:** {len(paths)}')
    print(f'- **Schema Components:** {len(components.get(\"schemas\", {}))}')
    print(f'- **Security Schemes:** {len(components.get(\"securitySchemes\", {}))}')
    print()

    # Count methods
    methods = {}
    for path, path_info in paths.items():
        for method in path_info.keys():
            if method != 'parameters':
                methods[method.upper()] = methods.get(method.upper(), 0) + 1

    print('## HTTP Methods')
    for method, count in sorted(methods.items()):
        print(f'- **{method}:** {count} endpoints')
")

## Usage

### Import into API tools:
\`\`\`bash
# Import into Postman, Insomnia, etc.
cat docs/api/openapi.json
\`\`\`

### Generate client SDKs:
\`\`\`bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate -i docs/api/openapi.json -g typescript-axios -o clients/typescript

# Generate Python client
openapi-generator generate -i docs/api/openapi.json -g python -o clients/python
\`\`\`

### Start Swagger UI locally:
\`\`\`bash
docker run -p 8080:8080 -e SWAGGER_JSON=/api.json -v \$(pwd)/docs/api/openapi.json:/api.json swaggerapi/swagger-ui
\`\`\`

*Auto-generated by \`scripts/gen_openapi.sh\`*
EOF

echo -e "${GREEN}[SUCCESS]${NC} Summary created: $SUMMARY_FILE"

echo -e "${GREEN}[COMPLETE]${NC} OpenAPI documentation generation completed successfully!"
echo -e "${YELLOW}[NEXT STEPS]${NC}"
echo "  1. Review the generated file: docs/api/openapi.json"
echo "  2. Import into API testing tools (Postman, Insomnia)"
echo "  3. Generate client SDKs if needed"
echo "  4. Set up automated generation in CI/CD pipeline"