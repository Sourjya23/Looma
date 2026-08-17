import os
import re

for root, _, files in os.walk('apps/web/src'):
    for file in files:
        if (file.endswith('.tsx') or file.endswith('.ts')) and file != 'api.ts':
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            new_content = re.sub(r"fetch\(['\"]/api/([^'\"]*)['\"]", r"fetch(`${API_BASE}/\1`", content)
            new_content = re.sub(r"fetch\(`/api/", r"fetch(`${API_BASE}/", new_content)
            
            if new_content != content:
                if "import { API_BASE }" not in new_content:
                    lines = new_content.split('\n')
                    last_import_idx = -1
                    for i, line in enumerate(lines):
                        if line.startswith('import '):
                            last_import_idx = i
                    if last_import_idx != -1:
                        lines.insert(last_import_idx + 1, "import { API_BASE } from '@/lib/api';")
                    else:
                        lines.insert(0, "import { API_BASE } from '@/lib/api';")
                    new_content = '\n'.join(lines)
                
                with open(path, 'w') as f:
                    f.write(new_content)

print("Done fixing API urls")
