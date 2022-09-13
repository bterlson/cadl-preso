import { paramMessage, createCadlLibrary, createDecoratorDefinition, cadlTypeToJson, getFriendlyName, isTemplateInstance, getServiceNamespace } from '@cadl-lang/compiler';
import { http } from '@cadl-lang/rest';

const libDef = {
    name: "@cadl-lang/openapi",
    diagnostics: {
        "invalid-extension-key": {
            severity: "error",
            messages: {
                default: paramMessage `OpenAPI extension must start with 'x-' but was '${"value"}'`,
            },
        },
        "duplicate-type-name": {
            severity: "error",
            messages: {
                default: paramMessage `Duplicate type name: '${"value"}'. Check @friendlyName decorators and overlap with types in Cadl or service namespace.`,
                parameter: paramMessage `Duplicate parameter key: '${"value"}'. Check @friendlyName decorators and overlap with types in Cadl or service namespace.`,
            },
        },
    },
};
const { reportDiagnostic } = createCadlLibrary(libDef);

const namespace = "OpenAPI";
const operationIdsKey = Symbol("operationIds");
const operationIdDecorator = createDecoratorDefinition({
    name: "@operationId",
    target: "Operation",
    args: [{ kind: "String" }],
});
/**
 * Set a sepecific operation ID.
 * @param context Decorator Context
 * @param entity Decorator target
 * @param opId Operation ID.
 */
function $operationId(context, entity, opId) {
    if (!operationIdDecorator.validate(context, entity, [opId])) {
        return;
    }
    context.program.stateMap(operationIdsKey).set(entity, opId);
}
/**
 * @returns operationId set via the @operationId decorator or `undefined`
 */
function getOperationId(program, entity) {
    return program.stateMap(operationIdsKey).get(entity);
}
const openApiExtensionKey = Symbol("openApiExtension");
const extensionDecorator = createDecoratorDefinition({
    name: "@extension",
    target: "Any",
    args: [{ kind: "String" }, { kind: "Any" }],
});
function $extension(context, entity, extensionName, value) {
    if (!extensionDecorator.validate(context, entity, [extensionName, value])) {
        return;
    }
    if (!isOpenAPIExtensionKey(extensionName)) {
        reportDiagnostic(context.program, {
            code: "invalid-extension-key",
            format: { value: extensionName },
            target: entity,
        });
    }
    const [data, diagnostics] = cadlTypeToJson(value, entity);
    if (diagnostics.length > 0) {
        context.program.reportDiagnostics(diagnostics);
    }
    setExtension(context.program, entity, extensionName, data);
}
function setExtension(program, entity, extensionName, data) {
    var _a;
    const openApiExtensions = program.stateMap(openApiExtensionKey);
    const typeExtensions = (_a = openApiExtensions.get(entity)) !== null && _a !== void 0 ? _a : new Map();
    typeExtensions.set(extensionName, data);
    openApiExtensions.set(entity, typeExtensions);
}
function getExtensions(program, entity) {
    var _a;
    return (_a = program.stateMap(openApiExtensionKey).get(entity)) !== null && _a !== void 0 ? _a : new Map();
}
function isOpenAPIExtensionKey(key) {
    return key.startsWith("x-");
}
const defaultResponseDecorator = createDecoratorDefinition({
    name: "@defaultResponse",
    target: "Model",
    args: [],
});
/**
 * The @defaultResponse decorator can be applied to a model. When that model is used
 * as the return type of an operation, this return type will be the default response.
 *
 */
const defaultResponseKey = Symbol("defaultResponse");
function $defaultResponse(context, entity) {
    if (!defaultResponseDecorator.validate(context, entity, [])) {
        return;
    }
    http.setStatusCode(context.program, entity, ["*"]);
    context.program.stateSet(defaultResponseKey).add(entity);
}
/**
 * Check if the given model has been mark as a default response.
 * @param program Cadl Program
 * @param entity Model to check.
 * @returns boolean.
 */
function isDefaultResponse(program, entity) {
    return program.stateSet(defaultResponseKey).has(entity);
}
const externalDocsKey = Symbol("externalDocs");
const externalDocsDecorator = createDecoratorDefinition({
    name: "@externalDocs",
    target: "Any",
    args: [{ kind: "String" }, { kind: "String", optional: true }],
});
/**
 * Allows referencing an external resource for extended documentation.
 * @param url The URL for the target documentation. Value MUST be in the format of a URL.
 * @param @optional description A short description of the target documentation.
 */
function $externalDocs(context, target, url, description) {
    if (!externalDocsDecorator.validate(context, target, [url, description])) {
        return;
    }
    const doc = { url };
    if (description) {
        doc.description = description;
    }
    context.program.stateMap(externalDocsKey).set(target, doc);
}
function getExternalDocs(program, entity) {
    return program.stateMap(externalDocsKey).get(entity);
}

/**
 * Determines whether a type will be inlined in OpenAPI rather than defined
 * as a schema and referenced.
 *
 * All anonymous types (anonymous models, arrays, tuples, etc.) are inlined.
 *
 * Template instantiations are inlined unless they have a friendly name.
 *
 * A friendly name can be provided by the user using `@friendlyName`
 * decorator, or chosen by default in simple cases.
 */
function shouldInline(program, type) {
    if (getFriendlyName(program, type)) {
        return false;
    }
    switch (type.kind) {
        case "Model":
            return (!type.name ||
                isTemplateInstance(type) ||
                program.checker.isStdType(type, "Array") ||
                program.checker.isStdType(type, "Record"));
        case "Enum":
        case "Union":
            return !type.name;
        default:
            return true;
    }
}
/**
 * Gets the name of a type to be used in OpenAPI.
 *
 * For inlined types: this is the Cadl-native name written to `x-cadl-name`.
 *
 * For non-inlined types: this is either the friendly name or the Cadl-native name.
 *
 * Cadl-native names are shortened to exclude root `Cadl` namespace and service
 * namespace using the provided `TypeNameOptions`.
 */
function getTypeName(program, type, options, existing) {
    var _a;
    const name = (_a = getFriendlyName(program, type)) !== null && _a !== void 0 ? _a : program.checker.getTypeName(type, options);
    if (existing && existing[name]) {
        reportDiagnostic(program, {
            code: "duplicate-type-name",
            format: {
                value: name,
            },
            target: type,
        });
    }
    return name;
}
/**
 * Gets the key that is used to define a parameter in OpenAPI.
 */
function getParameterKey(program, propery, newParam, existingParams, options) {
    const parent = propery.model;
    let key = getTypeName(program, parent, options);
    if (parent.properties.size > 1) {
        key += `.${propery.name}`;
    }
    // JSON check is workaround for https://github.com/microsoft/cadl/issues/462
    if (existingParams[key] && JSON.stringify(newParam) !== JSON.stringify(existingParams[key])) {
        reportDiagnostic(program, {
            code: "duplicate-type-name",
            messageId: "parameter",
            format: {
                value: key,
            },
            target: propery,
        });
    }
    return key;
}
/**
 * Resolve the OpenAPI operation ID for the given operation using the following logic:
 * - If @operationId was specified use that value
 * - If operation is defined at the root or under the service namespace return <operation.name>
 * - Otherwise(operation is under another namespace or interface) return <namespace/interface.name>_<opration.name>
 *
 * @param program Cadl Program
 * @param operation Operation
 * @returns Operation ID in this format <name> or <group>_<name>
 */
function resolveOperationId(program, operation) {
    const explicitOperationId = getOperationId(program, operation);
    if (explicitOperationId) {
        return explicitOperationId;
    }
    if (operation.interface) {
        return `${operation.interface.name}_${operation.name}`;
    }
    const namespace = operation.namespace;
    if (namespace === undefined ||
        namespace === program.checker.getGlobalNamespaceType() ||
        namespace === getServiceNamespace(program)) {
        return operation.name;
    }
    return `${namespace.name}_${operation.name}`;
}

var f0 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    namespace: namespace,
    $operationId: $operationId,
    getOperationId: getOperationId,
    $extension: $extension,
    setExtension: setExtension,
    getExtensions: getExtensions,
    $defaultResponse: $defaultResponse,
    isDefaultResponse: isDefaultResponse,
    $externalDocs: $externalDocs,
    getExternalDocs: getExternalDocs,
    shouldInline: shouldInline,
    getTypeName: getTypeName,
    getParameterKey: getParameterKey,
    resolveOperationId: resolveOperationId
});

const CadlJSSources = {
"dist/src/index.js": f0,
};
const CadlSources = {
  "package.json": "{\"name\":\"@cadl-lang/openapi\",\"version\":\"0.11.0\",\"author\":\"Microsoft Corporation\",\"description\":\"Cadl library providing OpenAPI concepts\",\"homepage\":\"https://github.com/Azure/cadl\",\"readme\":\"https://github.com/Azure/cadl/blob/master/README.md\",\"license\":\"MIT\",\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/Azure/cadl.git\"},\"bugs\":{\"url\":\"https://github.com/Azure/cadl/issues\"},\"keywords\":[\"cadl\"],\"type\":\"module\",\"main\":\"dist/src/index.js\",\"cadlMain\":\"dist/src/index.js\",\"exports\":{\".\":\"./dist/src/index.js\",\"./testing\":\"./dist/src/testing/index.js\"},\"typesVersions\":{\"*\":{\"*\":[\"./dist/src/index.d.ts\"],\"testing\":[\"./dist/src/testing/index.d.ts\"]}},\"engines\":{\"node\":\">=16.0.0\"},\"files\":[\"lib/*.cadl\",\"dist/**\",\"!dist/test/**\"],\"peerDependencies\":{\"@cadl-lang/compiler\":\"~0.34.0\",\"@cadl-lang/rest\":\"~0.16.0\"},\"devDependencies\":{\"@types/mocha\":\"~9.1.0\",\"@types/node\":\"~16.0.3\",\"@cadl-lang/compiler\":\"~0.34.0\",\"@cadl-lang/rest\":\"~0.16.0\",\"@cadl-lang/eslint-config-cadl\":\"~0.4.0\",\"@cadl-lang/library-linter\":\"~0.1.3\",\"@cadl-lang/eslint-plugin\":\"~0.1.1\",\"eslint\":\"^8.12.0\",\"mocha\":\"~9.2.0\",\"mocha-junit-reporter\":\"~2.0.2\",\"mocha-multi-reporters\":\"~1.5.1\",\"c8\":\"~7.11.0\",\"rimraf\":\"~3.0.2\",\"typescript\":\"~4.7.2\"},\"scripts\":{\"clean\":\"rimraf ./dist ./temp\",\"build\":\"tsc -p . && npm run lint-cadl-library\",\"watch\":\"tsc -p . --watch\",\"lint-cadl-library\":\"cadl compile . --warn-as-error --import @cadl-lang/library-linter --no-emit\",\"test\":\"mocha\",\"test-official\":\"c8 mocha --forbid-only --reporter mocha-multi-reporters\",\"lint\":\"eslint . --ext .ts --max-warnings=0\",\"lint:fix\":\"eslint . --fix --ext .ts\"}}",
  "../../../../cadl-azure/core/packages/compiler/lib/main.cadl": "import \"../dist/lib/decorators.js\";\nimport \"./lib.cadl\";\nimport \"./projected-names.cadl\";\n",
  "../../../../cadl-azure/core/packages/compiler/lib/lib.cadl": "namespace Cadl;\n\nmodel object {}\n\n@indexer(integer, T)\nmodel Array<T> {}\n\n@indexer(string, T)\nmodel Record<T> {}\n\n@intrinsic(\"bytes\")\nmodel bytes {}\n\n@numeric\n@intrinsic(\"numeric\")\nmodel numeric {}\n\n@numeric\n@intrinsic(\"integer\")\nmodel integer {}\n\n@numeric\n@intrinsic(\"float\")\nmodel float {}\n\n@numeric\n@intrinsic(\"int64\")\nmodel int64 {}\n\n@numeric\n@intrinsic(\"int32\")\nmodel int32 {}\n\n@numeric\n@intrinsic(\"int16\")\nmodel int16 {}\n\n@numeric\n@intrinsic(\"int8\")\nmodel int8 {}\n\n@numeric\n@intrinsic(\"uint64\")\nmodel uint64 {}\n\n@numeric\n@intrinsic(\"uint32\")\nmodel uint32 {}\n\n@numeric\n@intrinsic(\"uint16\")\nmodel uint16 {}\n\n@numeric\n@intrinsic(\"uint8\")\nmodel uint8 {}\n\n@numeric\n@intrinsic(\"safeint\")\nmodel safeint {}\n\n@numeric\n@intrinsic(\"float32\")\nmodel float32 {}\n\n@numeric\n@intrinsic(\"float64\")\nmodel float64 {}\n\n@intrinsic(\"string\")\nmodel string {}\n\n@intrinsic(\"plainDate\")\nmodel plainDate {}\n\n@intrinsic(\"plainTime\")\nmodel plainTime {}\n\n@intrinsic(\"zonedDateTime\")\nmodel zonedDateTime {}\n\n@intrinsic(\"duration\")\nmodel duration {}\n\n@intrinsic(\"boolean\")\nmodel boolean {}\n\n@intrinsic(\"null\")\nmodel null {}\n\n@deprecated(\"Map is deprecated, use Record<T> instead\")\nmodel Map<K, V> is Record<V>;\n\n@doc(\"The template for adding optional properties.\")\n@withOptionalProperties\nmodel OptionalProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for adding updateable properties.\")\n@withUpdateableProperties\nmodel UpdateableProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for omitting properties.\")\n@withoutOmittedProperties(TStringOrTuple)\nmodel OmitProperties<T, TStringOrTuple> {\n  ...T;\n}\n\n@withoutDefaultValues\nmodel OmitDefaults<T> {\n  ...T;\n}\n\n@doc(\"The template for setting the default visibility of key properties.\")\n@withDefaultKeyVisibility(Visibility)\nmodel DefaultKeyVisibility<T, Visibility> {\n  ...T;\n}\n",
  "../../../../cadl-azure/core/packages/compiler/lib/projected-names.cadl": "// Set of projections consuming the @projectedName decorator\n\n#suppress \"projections-are-experimental\"\nprojection op#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n"
};
const _CadlLibrary_ = {
  jsSourceFiles: CadlJSSources,
  cadlSourceFiles: CadlSources,
};

export { $defaultResponse, $extension, $externalDocs, $operationId, _CadlLibrary_, getExtensions, getExternalDocs, getOperationId, getParameterKey, getTypeName, isDefaultResponse, namespace, resolveOperationId, setExtension, shouldInline };
