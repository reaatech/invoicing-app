import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = import.meta.dirname.replace(/\/scripts$/, '')
const SRC = join(ROOT, 'node_modules', 'better-sqlite3', 'src')

function patch(file, oldStr, newStr) {
  const path = join(SRC, file)
  let content = readFileSync(path, 'utf8')
  if (content.includes(newStr)) return false
  if (!content.includes(oldStr)) {
    console.warn(`[patch-better-sqlite3] WARNING: could not find target in ${file}, skipping`)
    return false
  }
  content = content.replace(oldStr, newStr)
  writeFileSync(path, content)
  console.log(`[patch-better-sqlite3] Patched ${file}`)
  return true
}

// Fix v8::External::New requiring ExternalPointerTypeTag in V8 >= 14
patch(
  'better_sqlite3.cpp',
  '\tv8::Local<v8::External> data = v8::External::New(isolate, addon);',
  '#if defined(V8_MAJOR_VERSION) && V8_MAJOR_VERSION >= 14\n\tv8::Local<v8::External> data = v8::External::New(isolate, addon, v8::kExternalPointerTypeTagDefault);\n#else\n\tv8::Local<v8::External> data = v8::External::New(isolate, addon);\n#endif'
)

// Fix v8::External::Value requiring ExternalPointerTypeTag in V8 >= 14
patch(
  'util/macros.cpp',
  '#define OnlyAddon static_cast<Addon*>(info.Data().As<v8::External>()->Value())',
  '#if defined(V8_MAJOR_VERSION) && V8_MAJOR_VERSION >= 14\n#define OnlyAddon static_cast<Addon*>(info.Data().As<v8::External>()->Value(v8::kExternalPointerTypeTagDefault))\n#else\n#define OnlyAddon static_cast<Addon*>(info.Data().As<v8::External>()->Value())\n#endif'
)

// Fix SetNativeDataProperty overload ambiguity when '0' as setter
// matches multiple overloads in V8 >= 14
patch(
  'util/helpers.cpp',
  '\t\tfunc,\n\t\t0,\n\t\tdata',
  '\t\tfunc,\n#if defined(V8_MAJOR_VERSION) && V8_MAJOR_VERSION >= 14\n\t\tnullptr,\n#else\n\t\t0,\n#endif\n\t\tdata'
)
