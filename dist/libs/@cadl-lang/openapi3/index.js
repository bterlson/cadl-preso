import { validateDecoratorTarget, paramMessage, createCadlLibrary, resolvePath, checkIfServiceNamespace, getServiceNamespace, emitFile, getAllTags, getSummary, getDoc, getIntrinsicModelName, isErrorType, ignoreDiagnostics, isIntrinsic, isTemplateDeclarationOrInstance, getVisibility, getProperty, isStringType, getPropertyType, isNumericType, getFormat, getPattern, getMinLength, getMaxLength, getMinValue, getMaxValue, isSecret, getKnownValues, isNeverType, getServiceTitle, getServiceVersion, getServiceNamespaceString, isTemplateDeclaration, compilerAssert } from '@cadl-lang/compiler';
import { resolveOperationId, getTypeName, shouldInline, getParameterKey, getExtensions, getExternalDocs } from '@cadl-lang/openapi';
import { getDiscriminator, http } from '@cadl-lang/rest';
import { getAllRoutes, reportIfNoRoutes, getStatusCodeDescription, getContentTypes, getHeaderFieldName, getQueryParamName, getPathParamName, isStatusCode, getAuthentication } from '@cadl-lang/rest/http';
import { buildVersionProjections } from '@cadl-lang/versioning';

const refTargetsKey = Symbol("refs");
function $useRef(context, entity, refUrl) {
    if (!validateDecoratorTarget(context, entity, "@useRef", ["Model", "ModelProperty"])) {
        return;
    }
    context.program.stateMap(refTargetsKey).set(entity, refUrl);
}
function getRef(program, entity) {
    return program.stateMap(refTargetsKey).get(entity);
}
const oneOfKey = Symbol("oneOf");
function $oneOf(context, entity) {
    if (!validateDecoratorTarget(context, entity, "@oneOf", "Union")) {
        return;
    }
    context.program.stateMap(oneOfKey).set(entity, true);
}
function getOneOf(program, entity) {
    return program.stateMap(oneOfKey).get(entity);
}

const EmiterOptionsSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        "output-file": { type: "string", nullable: true },
        "new-line": { type: "string", enum: ["crlf", "lf"], nullable: true },
    },
    required: [],
};
const libDef = {
    name: "@cadl-lang/openapi3",
    diagnostics: {
        "invalid-server-variable": {
            severity: "error",
            messages: {
                default: paramMessage `Server variable '${"propName"}' must be assignable to 'string'. It must either be a string, enum of string or union of strings.`,
            },
        },
        "security-service-namespace": {
            severity: "error",
            messages: {
                default: "Cannot add security details to a namespace other than the service namespace.",
            },
        },
        "resource-namespace": {
            severity: "error",
            messages: {
                default: "Resource goes on namespace",
            },
        },
        "path-query": {
            severity: "error",
            messages: {
                default: `OpenAPI does not allow paths containing a query string.`,
            },
        },
        "duplicate-body": {
            severity: "error",
            messages: {
                default: "Duplicate @body declarations on response type",
            },
        },
        "duplicate-header": {
            severity: "error",
            messages: {
                default: paramMessage `The header ${"header"} is defined across multiple content types`,
            },
        },
        "status-code-in-default-response": {
            severity: "error",
            messages: {
                default: "a default response should not have an explicit status code",
            },
        },
        "invalid-schema": {
            severity: "error",
            messages: {
                default: paramMessage `Couldn't get schema for type ${"type"}`,
            },
        },
        "union-null": {
            severity: "error",
            messages: {
                default: "Cannot have a union containing only null types.",
            },
        },
        "union-unsupported": {
            severity: "error",
            messages: {
                default: "Unions are not supported unless all options are literals of the same type.",
                type: paramMessage `Type "${"kind"}" cannot be used in unions`,
                empty: "Empty unions are not supported for OpenAPI v3 - enums must have at least one value.",
                null: "Unions containing multiple model types cannot be emitted to OpenAPI v2 unless the union is between one model type and 'null'.",
            },
        },
        discriminator: {
            severity: "error",
            messages: {
                duplicate: paramMessage `Discriminator value "${"val"}" defined in two different variants: ${"model1"} and ${"model2"}`,
                missing: "The discriminator property is not defined in a variant of a discriminated union.",
                required: "The discriminator property must be a required property.",
                type: "The discriminator property must be type 'string'.",
            },
        },
        "discriminator-value": {
            severity: "warning",
            messages: {
                literal: "Each variant of a discriminated union should define the discriminator property with a string literal value.",
            },
        },
        "invalid-default": {
            severity: "error",
            messages: {
                default: paramMessage `Invalid type '${"type"}' for a default value`,
            },
        },
        "inline-cycle": {
            severity: "error",
            messages: {
                default: paramMessage `Cycle detected in '${"type"}'. Use @friendlyName decorator to assign an OpenAPI definition name and make it non-inline.`,
            },
        },
    },
    emitter: {
        options: EmiterOptionsSchema,
    },
};
const $lib = createCadlLibrary(libDef);
const { reportDiagnostic } = $lib;

const defaultOptions = {
    "output-file": "openapi.json",
    "new-line": "lf",
};
async function $onEmit(p, emitterOptions) {
    const options = resolveOptions(p, emitterOptions !== null && emitterOptions !== void 0 ? emitterOptions : {});
    const emitter = createOAPIEmitter(p, options);
    await emitter.emitOpenAPI();
}
function resolveOptions(program, options) {
    var _a;
    const resolvedOptions = { ...defaultOptions, ...options };
    return {
        newLine: resolvedOptions["new-line"],
        outputFile: resolvePath((_a = program.compilerOptions.outputPath) !== null && _a !== void 0 ? _a : "./cadl-output", resolvedOptions["output-file"]),
    };
}
// NOTE: These functions aren't meant to be used directly as decorators but as a
// helper functions for other decorators.  The security information given here
// will be inserted into the `security` and `securityDefinitions` sections of
// the emitted OpenAPI document.
const securityDetailsKey = Symbol("securityDetails");
function getSecurityDetails(program, serviceNamespace) {
    const definitions = program.stateMap(securityDetailsKey);
    if (definitions.has(serviceNamespace)) {
        return definitions.get(serviceNamespace);
    }
    else {
        const details = { definitions: {}, requirements: [] };
        definitions.set(serviceNamespace, details);
        return details;
    }
}
function getSecurityRequirements(program, serviceNamespace) {
    return getSecurityDetails(program, serviceNamespace).requirements;
}
function getSecurityDefinitions(program, serviceNamespace) {
    return getSecurityDetails(program, serviceNamespace).definitions;
}
function addSecurityRequirement(program, namespace, name, scopes) {
    if (!checkIfServiceNamespace(program, namespace)) {
        reportDiagnostic(program, {
            code: "security-service-namespace",
            target: namespace,
        });
    }
    const req = {};
    req[name] = scopes;
    const requirements = getSecurityRequirements(program, namespace);
    requirements.push(req);
}
function addSecurityDefinition(program, namespace, name, details) {
    if (!checkIfServiceNamespace(program, namespace)) {
        reportDiagnostic(program, {
            code: "security-service-namespace",
            target: namespace,
        });
        return;
    }
    const definitions = getSecurityDefinitions(program, namespace);
    definitions[name] = details;
}
function createOAPIEmitter(program, options) {
    let root;
    // Get the service namespace string for use in name shortening
    let serviceNamespace;
    let currentPath;
    let currentEndpoint;
    // Keep a list of all Types encountered that need schema definitions
    let schemas = new Set();
    // Keep track of inline types still in the process of having their schema computed
    // This is used to detect cycles in inline types, which is an
    let inProgressInlineTypes = new Set();
    // Map model properties that represent shared parameters to their parameter
    // definition that will go in #/components/parameters. Inlined parameters do not go in
    // this map.
    let params;
    // De-dupe the per-endpoint tags that will be added into the #/tags
    let tags;
    const typeNameOptions = {
        // shorten type names by removing Cadl and service namespace
        namespaceFilter(ns) {
            const name = program.checker.getNamespaceString(ns);
            return name !== "Cadl" && name !== serviceNamespace;
        },
    };
    return { emitOpenAPI };
    function initializeEmitter(serviceNamespaceType, version) {
        var _a;
        const auth = processAuth(serviceNamespaceType);
        root = {
            openapi: "3.0.0",
            info: {
                title: getServiceTitle(program),
                version: version !== null && version !== void 0 ? version : getServiceVersion(program),
                description: getDoc(program, serviceNamespaceType),
            },
            externalDocs: getExternalDocs(program, serviceNamespaceType),
            tags: [],
            paths: {},
            security: auth === null || auth === void 0 ? void 0 : auth.security,
            components: {
                parameters: {},
                requestBodies: {},
                responses: {},
                schemas: {},
                examples: {},
                securitySchemes: (_a = auth === null || auth === void 0 ? void 0 : auth.securitySchemes) !== null && _a !== void 0 ? _a : {},
            },
        };
        const servers = http.getServers(program, serviceNamespaceType);
        if (servers) {
            root.servers = resolveServers(servers);
        }
        serviceNamespace = getServiceNamespaceString(program);
        currentPath = root.paths;
        schemas = new Set();
        inProgressInlineTypes = new Set();
        params = new Map();
        tags = new Set();
    }
    // Todo: Should be able to replace with isRelatedTo(prop.type, "string") https://github.com/microsoft/cadl/pull/571
    function isValidServerVariableType(program, type) {
        switch (type.kind) {
            case "String":
                return true;
            case "Model":
                const name = getIntrinsicModelName(program, type);
                return name === "string";
            case "Enum":
                for (const member of type.members) {
                    if (member.value && typeof member.value !== "string") {
                        return false;
                    }
                }
                return true;
            case "Union":
                for (const option of type.options) {
                    if (!isValidServerVariableType(program, option)) {
                        return false;
                    }
                }
                return true;
            default:
                return false;
        }
    }
    function validateValidServerVariable(program, prop) {
        const isValid = isValidServerVariableType(program, prop.type);
        if (!isValid) {
            reportDiagnostic(program, {
                code: "invalid-server-variable",
                format: { propName: prop.name },
                target: prop,
            });
        }
        return isValid;
    }
    function resolveServers(servers) {
        return servers.map((server) => {
            const variables = {};
            for (const [name, prop] of server.parameters) {
                if (!validateValidServerVariable(program, prop)) {
                    continue;
                }
                const variable = {
                    default: prop.default ? getDefaultValue(prop.default) : "",
                    description: getDoc(program, prop),
                };
                if (prop.type.kind === "Enum") {
                    variable.enum = getSchemaForEnum(prop.type).enum;
                }
                else if (prop.type.kind === "Union") {
                    variable.enum = getSchemaForUnion(prop.type).enum;
                }
                else if (prop.type.kind === "String") {
                    variable.enum = [prop.type.value];
                }
                variables[name] = variable;
            }
            return {
                url: server.url,
                description: server.description,
                variables,
            };
        });
    }
    async function emitOpenAPI() {
        const serviceNs = getServiceNamespace(program);
        if (!serviceNs) {
            return;
        }
        const versions = buildVersionProjections(program, serviceNs);
        for (const record of versions) {
            if (record.version) {
                record.projections.push({
                    projectionName: "atVersion",
                    arguments: [record.version],
                });
            }
            if (record.projections.length > 0) {
                program.enableProjections(record.projections);
            }
            await emitOpenAPIFromVersion(serviceNs, record.version);
        }
    }
    async function emitOpenAPIFromVersion(serviceNamespace, version) {
        initializeEmitter(serviceNamespace, version);
        try {
            const [routes] = getAllRoutes(program);
            reportIfNoRoutes(program, routes);
            for (const operation of routes) {
                emitOperation(operation);
            }
            emitReferences();
            emitTags();
            // Clean up empty entries
            if (root.components) {
                for (const elem of Object.keys(root.components)) {
                    if (Object.keys(root.components[elem]).length === 0) {
                        delete root.components[elem];
                    }
                }
            }
            if (!program.compilerOptions.noEmit && !program.hasError()) {
                // Write out the OpenAPI document to the output path
                const outPath = version
                    ? resolvePath(options.outputFile.replace(".json", `.${version}.json`))
                    : resolvePath(options.outputFile);
                await emitFile(program, {
                    path: outPath,
                    content: prettierOutput(JSON.stringify(root, null, 2)),
                    newLine: options.newLine,
                });
            }
        }
        catch (err) {
            if (err instanceof ErrorTypeFoundError) {
                // Return early, there must be a parse error if an ErrorType was
                // inserted into the Cadl output
                return;
            }
            else {
                throw err;
            }
        }
    }
    function emitOperation(operation) {
        const { path: fullPath, operation: op, verb, parameters } = operation;
        // If path contains a query string, issue msg and don't emit this endpoint
        if (fullPath.indexOf("?") > 0) {
            reportDiagnostic(program, { code: "path-query", target: op });
            return;
        }
        if (!root.paths[fullPath]) {
            root.paths[fullPath] = {};
        }
        currentPath = root.paths[fullPath];
        if (!currentPath[verb]) {
            currentPath[verb] = {};
        }
        currentEndpoint = currentPath[verb];
        const currentTags = getAllTags(program, op);
        if (currentTags) {
            currentEndpoint.tags = currentTags;
            for (const tag of currentTags) {
                // Add to root tags if not already there
                tags.add(tag);
            }
        }
        currentEndpoint.operationId = resolveOperationId(program, op);
        applyExternalDocs(op, currentEndpoint);
        // Set up basic endpoint fields
        currentEndpoint.summary = getSummary(program, op);
        currentEndpoint.description = getDoc(program, op);
        currentEndpoint.parameters = [];
        currentEndpoint.responses = {};
        emitEndpointParameters(parameters.parameters);
        emitRequestBody(op, op.parameters, parameters);
        emitResponses(operation.responses);
        attachExtensions(program, op, currentEndpoint);
    }
    function emitResponses(responses) {
        for (const response of responses) {
            emitResponseObject(response);
        }
    }
    function isBinaryPayload(body, contentType) {
        return (body.kind === "Model" &&
            body.name === "bytes" &&
            contentType !== "application/json" &&
            contentType !== "text/plain");
    }
    function getOpenAPIStatuscode(response) {
        switch (response.statusCode) {
            case "*":
                return "default";
            default:
                return response.statusCode;
        }
    }
    function emitResponseObject(response) {
        var _a, _b, _c, _d;
        const statusCode = getOpenAPIStatuscode(response);
        const openapiResponse = (_a = currentEndpoint.responses[statusCode]) !== null && _a !== void 0 ? _a : {
            description: (_b = response.description) !== null && _b !== void 0 ? _b : getResponseDescriptionForStatusCode(statusCode),
        };
        for (const data of response.responses) {
            if (data.headers && Object.keys(data.headers).length > 0) {
                (_c = openapiResponse.headers) !== null && _c !== void 0 ? _c : (openapiResponse.headers = {});
                // OpenAPI can't represent different headers per content type.
                // So we merge headers here, and report any duplicates.
                // It may be possible in principle to not error for identically declared
                // headers.
                for (const [key, value] of Object.entries(data.headers)) {
                    if (openapiResponse.headers[key]) {
                        reportDiagnostic(program, {
                            code: "duplicate-header",
                            format: { header: key },
                            target: response.type,
                        });
                        continue;
                    }
                    openapiResponse.headers[key] = getResponseHeader(value);
                }
            }
            if (data.body !== undefined) {
                (_d = openapiResponse.content) !== null && _d !== void 0 ? _d : (openapiResponse.content = {});
                for (const contentType of data.body.contentTypes) {
                    const isBinary = isBinaryPayload(data.body.type, contentType);
                    const schema = isBinary
                        ? { type: "string", format: "binary" }
                        : getSchemaOrRef(data.body.type);
                    openapiResponse.content[contentType] = { schema };
                }
            }
        }
        currentEndpoint.responses[statusCode] = openapiResponse;
    }
    function getResponseDescriptionForStatusCode(statusCode) {
        var _a;
        if (statusCode === "default") {
            return "An unexpected error response.";
        }
        return (_a = getStatusCodeDescription(statusCode)) !== null && _a !== void 0 ? _a : "unknown";
    }
    function getResponseHeader(prop) {
        const header = {};
        populateParameter(header, prop, "header");
        delete header.in;
        delete header.name;
        delete header.required;
        return header;
    }
    function getSchemaOrRef(type) {
        const refUrl = getRef(program, type);
        if (refUrl) {
            return {
                $ref: refUrl,
            };
        }
        if (type.kind === "Model" && type.name === getIntrinsicModelName(program, type)) {
            // if the model is one of the Cadl Intrinsic type.
            // it's a base Cadl "primitive" that corresponds directly to an OpenAPI
            // primitive. In such cases, we don't want to emit a ref and instead just
            // emit the base type directly.
            const builtIn = mapCadlIntrinsicModelToOpenAPI(type);
            if (builtIn !== undefined) {
                return builtIn;
            }
        }
        if (type.kind === "String" || type.kind === "Number" || type.kind === "Boolean") {
            // For literal types, we just want to emit them directly as well.
            return mapCadlTypeToOpenAPI(type);
        }
        type = getEffectiveSchemaType(type);
        const name = getTypeName(program, type, typeNameOptions);
        if (shouldInline(program, type)) {
            const schema = getSchemaForInlineType(type, name);
            if (schema === undefined && isErrorType(type)) {
                // Exit early so that syntax errors are exposed.  This error will
                // be caught and handled in emitOpenAPI.
                throw new ErrorTypeFoundError();
            }
            // helps to read output and correlate to Cadl
            if (schema) {
                schema["x-cadl-name"] = name;
            }
            return schema;
        }
        else {
            const placeholder = {
                $ref: "#/components/schemas/" + encodeURIComponent(name),
            };
            schemas.add(type);
            return placeholder;
        }
    }
    function getSchemaForInlineType(type, name) {
        if (inProgressInlineTypes.has(type)) {
            reportDiagnostic(program, {
                code: "inline-cycle",
                format: { type: name },
                target: type,
            });
            return {};
        }
        inProgressInlineTypes.add(type);
        const schema = getSchemaForType(type);
        inProgressInlineTypes.delete(type);
        return schema;
    }
    /**
     * If type is an anonymous model, tries to find a named model that has the same
     * set of properties when non-schema properties are excluded.
     */
    function getEffectiveSchemaType(type) {
        if (type.kind === "Model" && !type.name) {
            const effective = program.checker.getEffectiveModelType(type, isSchemaProperty);
            if (effective.name) {
                return effective;
            }
        }
        return type;
    }
    function getParamPlaceholder(property) {
        let spreadParam = false;
        if (property.sourceProperty) {
            // chase our sources all the way back to the first place this property
            // was defined.
            spreadParam = true;
            property = property.sourceProperty;
            while (property.sourceProperty) {
                property = property.sourceProperty;
            }
        }
        const refUrl = getRef(program, property);
        if (refUrl) {
            return {
                $ref: refUrl,
            };
        }
        if (params.has(property)) {
            return params.get(property);
        }
        const placeholder = {};
        // only parameters inherited by spreading from non-inlined type are shared in #/components/parameters
        if (spreadParam && property.model && !shouldInline(program, property.model)) {
            params.set(property, placeholder);
        }
        return placeholder;
    }
    function emitEndpointParameters(parameters) {
        for (const { type, name, param } of parameters) {
            // If param is a global parameter, just skip it
            if (params.has(param)) {
                currentEndpoint.parameters.push(params.get(param));
                continue;
            }
            switch (type) {
                case "path":
                    emitParameter(param, "path");
                    break;
                case "query":
                    emitParameter(param, "query");
                    break;
                case "header":
                    if (name !== "content-type") {
                        emitParameter(param, "header");
                    }
                    break;
            }
        }
    }
    function emitRequestBody(op, parent, parameters) {
        const bodyType = parameters.bodyType;
        const bodyParam = parameters.bodyParameter;
        if (bodyType === undefined) {
            return;
        }
        const requestBody = {
            description: bodyParam ? getDoc(program, bodyParam) : undefined,
            content: {},
        };
        const contentTypeParam = parameters.parameters.find((p) => p.type === "header" && p.name === "content-type");
        const contentTypes = contentTypeParam
            ? ignoreDiagnostics(getContentTypes(contentTypeParam.param))
            : ["application/json"];
        for (const contentType of contentTypes) {
            const isBinary = isBinaryPayload(bodyType, contentType);
            const bodySchema = isBinary ? { type: "string", format: "binary" } : getSchemaOrRef(bodyType);
            const contentEntry = {
                schema: bodySchema,
            };
            requestBody.content[contentType] = contentEntry;
        }
        currentEndpoint.requestBody = requestBody;
    }
    function emitParameter(param, kind) {
        const ph = getParamPlaceholder(param);
        currentEndpoint.parameters.push(ph);
        // If the parameter already has a $ref, don't bother populating it
        if (!("$ref" in ph)) {
            populateParameter(ph, param, kind);
        }
    }
    function populateParameter(ph, param, kind) {
        ph.name = param.name;
        ph.in = kind;
        ph.required = !param.optional;
        ph.description = getDoc(program, param);
        // Apply decorators to the schema for the parameter.
        const schema = applyIntrinsicDecorators(param, getSchemaForType(param.type));
        if (param.default) {
            schema.default = getDefaultValue(param.default);
        }
        attachExtensions(program, param, ph);
        // Description is already provided in the parameter itself.
        delete schema.description;
        ph.schema = schema;
    }
    function emitReferences() {
        for (const [property, param] of params) {
            const key = getParameterKey(program, property, param, root.components.parameters, typeNameOptions);
            root.components.parameters[key] = { ...param };
            for (const key of Object.keys(param)) {
                delete param[key];
            }
            param["$ref"] = "#/components/parameters/" + encodeURIComponent(key);
        }
        for (const type of schemas) {
            const schemaForType = getSchemaForType(type);
            if (schemaForType) {
                const name = getTypeName(program, type, typeNameOptions, root.components.schemas);
                root.components.schemas[name] = schemaForType;
            }
        }
    }
    function emitTags() {
        for (const tag of tags) {
            root.tags.push({ name: tag });
        }
    }
    function getSchemaForType(type) {
        const builtinType = mapCadlTypeToOpenAPI(type);
        if (builtinType !== undefined)
            return builtinType;
        if (type.kind === "Model") {
            return getSchemaForModel(type);
        }
        else if (type.kind === "Union") {
            return getSchemaForUnion(type);
        }
        else if (type.kind === "UnionVariant") {
            return getSchemaForUnionVariant(type);
        }
        else if (type.kind === "Enum") {
            return getSchemaForEnum(type);
        }
        reportDiagnostic(program, {
            code: "invalid-schema",
            format: { type: type.kind },
            target: type,
        });
        return undefined;
    }
    function getSchemaForEnum(e) {
        var _a;
        const values = [];
        if (e.members.length == 0) {
            reportUnsupportedUnion("empty");
            return undefined;
        }
        const type = enumMemberType(e.members[0]);
        for (const option of e.members) {
            if (type !== enumMemberType(option)) {
                reportUnsupportedUnion();
                continue;
            }
            values.push((_a = option.value) !== null && _a !== void 0 ? _a : option.name);
        }
        const schema = { type, description: getDoc(program, e) };
        if (values.length > 0) {
            schema.enum = values;
        }
        return schema;
        function enumMemberType(member) {
            if (typeof member.value === "number") {
                return "number";
            }
            return "string";
        }
        function reportUnsupportedUnion(messageId = "default") {
            reportDiagnostic(program, { code: "union-unsupported", messageId, target: e });
        }
    }
    function getSchemaForUnion(union) {
        let type;
        const nonNullOptions = union.options.filter((t) => !isNullType(t));
        const nullable = union.options.length != nonNullOptions.length;
        if (nonNullOptions.length === 0) {
            reportDiagnostic(program, { code: "union-null", target: union });
            return {};
        }
        const kind = nonNullOptions[0].kind;
        switch (kind) {
            case "String":
                type = "string";
                break;
            case "Number":
                type = "number";
                break;
            case "Boolean":
                type = "boolean";
                break;
            case "Model":
                type = "model";
                break;
            case "UnionVariant":
                type = "model";
                break;
            default:
                reportUnsupportedUnionType(nonNullOptions[0]);
                return {};
        }
        if (type === "model" || type === "array") {
            if (nonNullOptions.length === 1) {
                // Get the schema for the model type
                let schema = getSchemaOrRef(nonNullOptions[0]);
                if (nullable && schema.$ref) {
                    schema = {
                        type: "object",
                        allOf: [schema],
                        nullable: true,
                    };
                }
                else if (nullable) {
                    schema.nullable = true;
                }
                return schema;
            }
            else {
                const ofType = getOneOf(program, union) ? "oneOf" : "anyOf";
                const schema = { [ofType]: nonNullOptions.map((s) => getSchemaOrRef(s)) };
                return schema;
            }
        }
        const values = [];
        for (const option of nonNullOptions) {
            if (option.kind != kind) {
                reportUnsupportedUnion();
            }
            // We already know it's not a model type
            values.push(option.value);
        }
        const schema = { type };
        if (values.length > 0) {
            schema.enum = values;
        }
        if (nullable) {
            schema["nullable"] = true;
        }
        return schema;
        function reportUnsupportedUnionType(type) {
            reportDiagnostic(program, {
                code: "union-unsupported",
                messageId: "type",
                format: { kind: type.kind },
                target: type,
            });
        }
        function reportUnsupportedUnion() {
            reportDiagnostic(program, { code: "union-unsupported", target: union });
        }
    }
    function getSchemaForUnionVariant(variant) {
        const schema = getSchemaForType(variant.type);
        return schema;
    }
    function isNullType(type) {
        return isIntrinsic(program, type) && getIntrinsicModelName(program, type) === "null";
    }
    function getDefaultValue(type) {
        var _a;
        switch (type.kind) {
            case "String":
                return type.value;
            case "Number":
                return type.value;
            case "Boolean":
                return type.value;
            case "Tuple":
                return type.values.map(getDefaultValue);
            case "EnumMember":
                return (_a = type.value) !== null && _a !== void 0 ? _a : type.name;
            default:
                reportDiagnostic(program, {
                    code: "invalid-default",
                    format: { type: type.kind },
                    target: type,
                });
        }
    }
    function includeDerivedModel(model) {
        var _a;
        return (!isTemplateDeclaration(model) &&
            (model.templateArguments === undefined ||
                ((_a = model.templateArguments) === null || _a === void 0 ? void 0 : _a.length) === 0 ||
                model.derivedModels.length > 0));
    }
    function getSchemaForModel(model) {
        let modelSchema = {
            type: "object",
            properties: {},
            description: getDoc(program, model),
        };
        const derivedModels = model.derivedModels.filter(includeDerivedModel);
        // getSchemaOrRef on all children to push them into components.schemas
        for (const child of derivedModels) {
            getSchemaOrRef(child);
        }
        const discriminator = getDiscriminator(program, model);
        if (discriminator) {
            if (!validateDiscriminator(discriminator, derivedModels)) {
                // appropriate diagnostic is generated with the validate function
                return {};
            }
            const openApiDiscriminator = { ...discriminator };
            const mapping = getDiscriminatorMapping(discriminator, derivedModels);
            if (mapping) {
                openApiDiscriminator.mapping = mapping;
            }
            modelSchema.discriminator = openApiDiscriminator;
            modelSchema.properties[discriminator.propertyName] = {
                type: "string",
                description: `Discriminator property for ${model.name}.`,
            };
        }
        applyExternalDocs(model, modelSchema);
        for (const [name, prop] of model.properties) {
            if (!isSchemaProperty(prop)) {
                continue;
            }
            if (!prop.optional) {
                if (!modelSchema.required) {
                    modelSchema.required = [];
                }
                modelSchema.required.push(name);
            }
            modelSchema.properties[name] = resolveProperty(prop);
        }
        // Special case: if a model type extends a single *templated* base type and
        // has no properties of its own, absorb the definition of the base model
        // into this schema definition.  The assumption here is that any model type
        // defined like this is just meant to rename the underlying instance of a
        // templated type.
        if (model.baseModel &&
            isTemplateDeclarationOrInstance(model.baseModel) &&
            Object.keys(modelSchema.properties).length === 0) {
            // Take the base model schema but carry across the documentation property
            // that we set before
            const baseSchema = getSchemaForType(model.baseModel);
            modelSchema = {
                ...baseSchema,
                description: modelSchema.description,
            };
        }
        else if (model.baseModel) {
            modelSchema.allOf = [getSchemaOrRef(model.baseModel)];
        }
        // Attach any OpenAPI extensions
        attachExtensions(program, model, modelSchema);
        return modelSchema;
    }
    function resolveProperty(prop) {
        const description = getDoc(program, prop);
        const schema = getSchemaOrRef(prop.type);
        // Apply decorators on the property to the type's schema
        const additionalProps = applyIntrinsicDecorators(prop, {});
        if (description) {
            additionalProps.description = description;
        }
        if (prop.default) {
            additionalProps.default = getDefaultValue(prop.default);
        }
        // Should the property be marked as readOnly?
        const vis = getVisibility(program, prop);
        if (vis && vis.includes("read") && vis.length == 1) {
            additionalProps.readOnly = true;
        }
        // Attach any additional OpenAPI extensions
        attachExtensions(program, prop, additionalProps);
        if ("$ref" in schema) {
            if (Object.keys(additionalProps).length === 0) {
                return schema;
            }
            else {
                return {
                    allOf: [schema],
                    ...additionalProps,
                };
            }
        }
        else {
            return { ...schema, ...additionalProps };
        }
    }
    function attachExtensions(program, type, emitObject) {
        // Attach any OpenAPI extensions
        const extensions = getExtensions(program, type);
        if (extensions) {
            for (const key of extensions.keys()) {
                emitObject[key] = extensions.get(key);
            }
        }
    }
    function validateDiscriminator(discriminator, childModels) {
        var _a;
        const { propertyName } = discriminator;
        const retVals = childModels.map((t) => {
            const prop = getProperty(t, propertyName);
            if (!prop) {
                reportDiagnostic(program, { code: "discriminator", messageId: "missing", target: t });
                return false;
            }
            let retval = true;
            if (!isOasString(prop.type)) {
                reportDiagnostic(program, { code: "discriminator", messageId: "type", target: prop });
                retval = false;
            }
            if (prop.optional) {
                reportDiagnostic(program, { code: "discriminator", messageId: "required", target: prop });
                retval = false;
            }
            return retval;
        });
        // Map of discriminator value to the model in which it is declared
        const discriminatorValues = new Map();
        for (const t of childModels) {
            // Get the discriminator property directly in the child model
            const prop = (_a = t.properties) === null || _a === void 0 ? void 0 : _a.get(propertyName);
            // Issue warning diagnostic if discriminator property missing or is not a string literal
            if (!prop || !isStringLiteral(prop.type)) {
                reportDiagnostic(program, {
                    code: "discriminator-value",
                    messageId: "literal",
                    target: prop || t,
                });
            }
            if (prop) {
                const vals = getStringValues(prop.type);
                vals.forEach((val) => {
                    if (discriminatorValues.has(val)) {
                        reportDiagnostic(program, {
                            code: "discriminator",
                            messageId: "duplicate",
                            format: { val: val, model1: discriminatorValues.get(val), model2: t.name },
                            target: prop,
                        });
                        retVals.push(false);
                    }
                    else {
                        discriminatorValues.set(val, t.name);
                    }
                });
            }
        }
        return retVals.every((v) => v);
    }
    function getDiscriminatorMapping(discriminator, derivedModels) {
        const { propertyName } = discriminator;
        const getMapping = (t) => {
            var _a;
            const prop = (_a = t.properties) === null || _a === void 0 ? void 0 : _a.get(propertyName);
            if (prop) {
                return getStringValues(prop.type).flatMap((v) => [{ [v]: getSchemaOrRef(t).$ref }]);
            }
            return undefined;
        };
        const mappings = derivedModels.flatMap(getMapping).filter((v) => v); // only defined values
        return mappings.length > 0 ? mappings.reduce((a, s) => ({ ...a, ...s }), {}) : undefined;
    }
    // An openapi "string" can be defined in several different ways in Cadl
    function isOasString(type) {
        if (type.kind === "String") {
            // A string literal
            return true;
        }
        else if (type.kind === "Model" && type.name === "string") {
            // string type
            return true;
        }
        else if (type.kind === "Union") {
            // A union where all variants are an OasString
            return type.options.every((o) => isOasString(o));
        }
        return false;
    }
    function isStringLiteral(type) {
        return (type.kind === "String" ||
            (type.kind === "Union" && type.options.every((o) => o.kind === "String")));
    }
    // Return any string literal values for type
    function getStringValues(type) {
        if (type.kind === "String") {
            return [type.value];
        }
        else if (type.kind === "Union") {
            return type.options.flatMap(getStringValues).filter((v) => v);
        }
        return [];
    }
    /**
     * A "schema property" here is a property that is emitted to OpenAPI schema.
     *
     * Headers, parameters, status codes are not schema properties even they are
     * represented as properties in Cadl.
     */
    function isSchemaProperty(property) {
        const headerInfo = getHeaderFieldName(program, property);
        const queryInfo = getQueryParamName(program, property);
        const pathInfo = getPathParamName(program, property);
        const statusCodeinfo = isStatusCode(program, property);
        return !(headerInfo || queryInfo || pathInfo || statusCodeinfo);
    }
    function applyIntrinsicDecorators(cadlType, target) {
        const newTarget = { ...target };
        const docStr = getDoc(program, cadlType);
        const isString = isStringType(program, getPropertyType(cadlType));
        const isNumeric = isNumericType(program, getPropertyType(cadlType));
        if (!target.description && docStr) {
            newTarget.description = docStr;
        }
        const formatStr = getFormat(program, cadlType);
        if (isString && !target.format && formatStr) {
            newTarget.format = formatStr;
        }
        const pattern = getPattern(program, cadlType);
        if (isString && !target.pattern && pattern) {
            newTarget.pattern = pattern;
        }
        const minLength = getMinLength(program, cadlType);
        if (isString && !target.minLength && minLength !== undefined) {
            newTarget.minLength = minLength;
        }
        const maxLength = getMaxLength(program, cadlType);
        if (isString && !target.maxLength && maxLength !== undefined) {
            newTarget.maxLength = maxLength;
        }
        const minValue = getMinValue(program, cadlType);
        if (isNumeric && !target.minimum && minValue !== undefined) {
            newTarget.minimum = minValue;
        }
        const maxValue = getMaxValue(program, cadlType);
        if (isNumeric && !target.maximum && maxValue !== undefined) {
            newTarget.maximum = maxValue;
        }
        if (isSecret(program, cadlType)) {
            newTarget.format = "password";
        }
        if (isString) {
            const values = getKnownValues(program, cadlType);
            if (values) {
                return {
                    oneOf: [newTarget, getSchemaForEnum(values)],
                };
            }
        }
        return newTarget;
    }
    function applyExternalDocs(cadlType, target) {
        const externalDocs = getExternalDocs(program, cadlType);
        if (externalDocs) {
            target.externalDocs = externalDocs;
        }
    }
    // Map an Cadl type to an OA schema. Returns undefined when the resulting
    // OA schema is just a regular object schema.
    function mapCadlTypeToOpenAPI(cadlType) {
        switch (cadlType.kind) {
            case "Number":
                return { type: "number", enum: [cadlType.value] };
            case "String":
                return { type: "string", enum: [cadlType.value] };
            case "Boolean":
                return { type: "boolean", enum: [cadlType.value] };
            case "Model":
                return mapCadlIntrinsicModelToOpenAPI(cadlType);
        }
    }
    /**
     * Map Cadl intrinsic models to open api definitions
     */
    function mapCadlIntrinsicModelToOpenAPI(cadlType) {
        if (cadlType.indexer) {
            if (isNeverType(cadlType.indexer.key)) ;
            else {
                const name = getIntrinsicModelName(program, cadlType.indexer.key);
                if (name === "string") {
                    return {
                        type: "object",
                        additionalProperties: getSchemaOrRef(cadlType.indexer.value),
                    };
                }
                else if (name === "integer") {
                    return {
                        type: "array",
                        items: getSchemaOrRef(cadlType.indexer.value),
                    };
                }
            }
        }
        if (!isIntrinsic(program, cadlType)) {
            return undefined;
        }
        const name = getIntrinsicModelName(program, cadlType);
        switch (name) {
            case "bytes":
                return { type: "string", format: "byte" };
            case "int8":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "int8" });
            case "int16":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "int16" });
            case "int32":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "int32" });
            case "int64":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "int64" });
            case "safeint":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "int64" });
            case "uint8":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "uint8" });
            case "uint16":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "uint16" });
            case "uint32":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "uint32" });
            case "uint64":
                return applyIntrinsicDecorators(cadlType, { type: "integer", format: "uint64" });
            case "float64":
                return applyIntrinsicDecorators(cadlType, { type: "number", format: "double" });
            case "float32":
                return applyIntrinsicDecorators(cadlType, { type: "number", format: "float" });
            case "string":
                return applyIntrinsicDecorators(cadlType, { type: "string" });
            case "boolean":
                return { type: "boolean" };
            case "plainDate":
                return { type: "string", format: "date" };
            case "zonedDateTime":
                return { type: "string", format: "date-time" };
            case "plainTime":
                return { type: "string", format: "time" };
            case "duration":
                return { type: "string", format: "duration" };
        }
    }
    function processAuth(serviceNamespace) {
        const authentication = getAuthentication(program, serviceNamespace);
        if (authentication) {
            return processServiceAuthentication(authentication);
        }
        return undefined;
    }
    function processServiceAuthentication(authentication) {
        const oaiSchemes = {};
        const security = [];
        for (const option of authentication.options) {
            const oai3SecurityOption = {};
            for (const scheme of option.schemes) {
                const [oaiScheme, scopes] = getOpenAPI3Scheme(scheme);
                oaiSchemes[scheme.id] = oaiScheme;
                oai3SecurityOption[scheme.id] = scopes;
            }
            security.push(oai3SecurityOption);
        }
        return { securitySchemes: oaiSchemes, security };
    }
    function getOpenAPI3Scheme(auth) {
        switch (auth.type) {
            case "http":
                return [{ type: "http", scheme: auth.scheme, description: auth.description }, []];
            case "apiKey":
                return [
                    { type: "apiKey", in: auth.in, name: auth.name, description: auth.description },
                    [],
                ];
            case "oauth2":
                const flows = {};
                const scopes = [];
                for (const flow of auth.flows) {
                    scopes.push(...flow.scopes);
                    flows[flow.type] = {
                        authorizationUrl: flow.authorizationUrl,
                        tokenUrl: flow.tokenUrl,
                        refreshUrl: flow.refreshUrl,
                        scopes: Object.fromEntries(flow.scopes.map((x) => [x, ""])),
                    };
                }
                return [{ type: "oauth2", flows, description: auth.description }, scopes];
            default:
                compilerAssert(false, "Unreachable");
        }
    }
}
function prettierOutput(output) {
    return output + "\n";
}
class ErrorTypeFoundError extends Error {
    constructor() {
        super("Error type found in evaluated Cadl output");
    }
}

const namespace = "OpenAPI";

var f0 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    namespace: namespace,
    $lib: $lib,
    $useRef: $useRef,
    getRef: getRef,
    $oneOf: $oneOf,
    getOneOf: getOneOf,
    $onEmit: $onEmit,
    resolveOptions: resolveOptions,
    addSecurityRequirement: addSecurityRequirement,
    addSecurityDefinition: addSecurityDefinition
});

const CadlJSSources = {
"dist/src/index.js": f0,
};
const CadlSources = {
  "package.json": "{\"name\":\"@cadl-lang/openapi3\",\"version\":\"0.14.0\",\"author\":\"Microsoft Corporation\",\"description\":\"Cadl library for emitting OpenAPI 3.0 from the Cadl REST protocol binding\",\"homepage\":\"https://github.com/Microsoft/cadl\",\"readme\":\"https://github.com/Microsoft/cadl/blob/master/README.md\",\"license\":\"MIT\",\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/Microsoft/cadl.git\"},\"bugs\":{\"url\":\"https://github.com/Microsoft/cadl/issues\"},\"keywords\":[\"cadl\"],\"type\":\"module\",\"main\":\"dist/src/index.js\",\"exports\":{\".\":\"./dist/src/index.js\",\"./testing\":\"./dist/src/testing/index.js\"},\"typesVersions\":{\"*\":{\"*\":[\"./dist/src/index.d.ts\"],\"testing\":[\"./dist/src/testing/index.d.ts\"]}},\"cadlMain\":\"dist/src/index.js\",\"engines\":{\"node\":\">=16.0.0\"},\"files\":[\"lib/*.cadl\",\"dist/**\",\"!dist/test/**\"],\"peerDependencies\":{\"@cadl-lang/versioning\":\"~0.7.0\",\"@cadl-lang/compiler\":\"~0.34.0\",\"@cadl-lang/rest\":\"~0.16.0\",\"@cadl-lang/openapi\":\"~0.11.0\"},\"devDependencies\":{\"@types/mocha\":\"~9.1.0\",\"@types/node\":\"~16.0.3\",\"@cadl-lang/compiler\":\"~0.34.0\",\"@cadl-lang/rest\":\"~0.16.0\",\"@cadl-lang/openapi\":\"~0.11.0\",\"@cadl-lang/versioning\":\"~0.7.0\",\"@cadl-lang/eslint-config-cadl\":\"~0.4.0\",\"@cadl-lang/library-linter\":\"~0.1.3\",\"@cadl-lang/eslint-plugin\":\"~0.1.1\",\"eslint\":\"^8.12.0\",\"mocha\":\"~9.2.0\",\"mocha-junit-reporter\":\"~2.0.2\",\"mocha-multi-reporters\":\"~1.5.1\",\"c8\":\"~7.11.0\",\"rimraf\":\"~3.0.2\",\"typescript\":\"~4.7.2\"},\"scripts\":{\"clean\":\"rimraf ./dist ./temp\",\"build\":\"tsc -p . && npm run lint-cadl-library\",\"watch\":\"tsc -p . --watch\",\"lint-cadl-library\":\"cadl compile . --warn-as-error --import @cadl-lang/library-linter --no-emit\",\"test\":\"mocha\",\"test-official\":\"c8 mocha --forbid-only --reporter mocha-multi-reporters\",\"lint\":\"eslint . --ext .ts --max-warnings=0\",\"lint:fix\":\"eslint . --fix --ext .ts\"}}",
  "../../../../cadl-azure/core/packages/compiler/lib/main.cadl": "import \"../dist/lib/decorators.js\";\nimport \"./lib.cadl\";\nimport \"./projected-names.cadl\";\n",
  "../../../../cadl-azure/core/packages/compiler/lib/lib.cadl": "namespace Cadl;\n\nmodel object {}\n\n@indexer(integer, T)\nmodel Array<T> {}\n\n@indexer(string, T)\nmodel Record<T> {}\n\n@intrinsic(\"bytes\")\nmodel bytes {}\n\n@numeric\n@intrinsic(\"numeric\")\nmodel numeric {}\n\n@numeric\n@intrinsic(\"integer\")\nmodel integer {}\n\n@numeric\n@intrinsic(\"float\")\nmodel float {}\n\n@numeric\n@intrinsic(\"int64\")\nmodel int64 {}\n\n@numeric\n@intrinsic(\"int32\")\nmodel int32 {}\n\n@numeric\n@intrinsic(\"int16\")\nmodel int16 {}\n\n@numeric\n@intrinsic(\"int8\")\nmodel int8 {}\n\n@numeric\n@intrinsic(\"uint64\")\nmodel uint64 {}\n\n@numeric\n@intrinsic(\"uint32\")\nmodel uint32 {}\n\n@numeric\n@intrinsic(\"uint16\")\nmodel uint16 {}\n\n@numeric\n@intrinsic(\"uint8\")\nmodel uint8 {}\n\n@numeric\n@intrinsic(\"safeint\")\nmodel safeint {}\n\n@numeric\n@intrinsic(\"float32\")\nmodel float32 {}\n\n@numeric\n@intrinsic(\"float64\")\nmodel float64 {}\n\n@intrinsic(\"string\")\nmodel string {}\n\n@intrinsic(\"plainDate\")\nmodel plainDate {}\n\n@intrinsic(\"plainTime\")\nmodel plainTime {}\n\n@intrinsic(\"zonedDateTime\")\nmodel zonedDateTime {}\n\n@intrinsic(\"duration\")\nmodel duration {}\n\n@intrinsic(\"boolean\")\nmodel boolean {}\n\n@intrinsic(\"null\")\nmodel null {}\n\n@deprecated(\"Map is deprecated, use Record<T> instead\")\nmodel Map<K, V> is Record<V>;\n\n@doc(\"The template for adding optional properties.\")\n@withOptionalProperties\nmodel OptionalProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for adding updateable properties.\")\n@withUpdateableProperties\nmodel UpdateableProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for omitting properties.\")\n@withoutOmittedProperties(TStringOrTuple)\nmodel OmitProperties<T, TStringOrTuple> {\n  ...T;\n}\n\n@withoutDefaultValues\nmodel OmitDefaults<T> {\n  ...T;\n}\n\n@doc(\"The template for setting the default visibility of key properties.\")\n@withDefaultKeyVisibility(Visibility)\nmodel DefaultKeyVisibility<T, Visibility> {\n  ...T;\n}\n",
  "../../../../cadl-azure/core/packages/compiler/lib/projected-names.cadl": "// Set of projections consuming the @projectedName decorator\n\n#suppress \"projections-are-experimental\"\nprojection op#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n"
};
const _CadlLibrary_ = {
  jsSourceFiles: CadlJSSources,
  cadlSourceFiles: CadlSources,
};

export { $lib, $onEmit, $oneOf, $useRef, _CadlLibrary_, addSecurityDefinition, addSecurityRequirement, getOneOf, getRef, namespace, resolveOptions };
