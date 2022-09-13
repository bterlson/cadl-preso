import { paramMessage, createCadlLibrary, createDecoratorDefinition, setCadlNamespace, validateDecoratorParamCount, validateDecoratorTarget, createDiagnosticCollector, cadlTypeToJson, getDoc, isIntrinsic, getIntrinsicModelName, isArrayModelType, isVoidType, isErrorModel, isKey, isErrorType, getKeyName, $visibility, $list, getServiceNamespace, isTemplateDeclaration, isTemplateDeclarationOrInstance, isGlobalNamespace } from '@cadl-lang/compiler';

const libDefinition = {
    name: "@cadl-lang/rest",
    diagnostics: {
        "http-verb-duplicate": {
            severity: "error",
            messages: {
                default: paramMessage `HTTP verb already applied to ${"entityName"}`,
            },
        },
        "http-verb-wrong-type": {
            severity: "error",
            messages: {
                default: paramMessage `Cannot use @${"verb"} on a ${"entityKind"}`,
            },
        },
        "operation-resource-wrong-type": {
            severity: "error",
            messages: {
                default: paramMessage `Cannot register resource operation "${"operation"}" on a ${"kind"}`,
            },
        },
        "not-key-type": {
            severity: "error",
            messages: {
                default: "Cannot copy keys from a non-key type (KeysOf<T> or ParentKeysOf<T>)",
            },
        },
        "resource-missing-key": {
            severity: "error",
            messages: {
                default: paramMessage `Type '${"modelName"}' is used as a resource and therefore must have a key. Use @key to designate a property as the key.`,
            },
        },
        "resource-missing-error": {
            severity: "error",
            messages: {
                default: paramMessage `Type '${"modelName"}' is used as an error and therefore must have the @error decorator applied.`,
            },
        },
        "duplicate-key": {
            severity: "error",
            messages: {
                default: paramMessage `More than one key found on model type ${"resourceName"}`,
            },
        },
        "duplicate-parent-key": {
            severity: "error",
            messages: {
                default: paramMessage `Resource type '${"resourceName"}' has a key property named '${"keyName"}' which is already used by parent type '${"parentName"}'.`,
            },
        },
        "missing-path-param": {
            severity: "error",
            messages: {
                default: paramMessage `Path contains parameter ${"param"} but wasn't found in given parameters`,
            },
        },
        "optional-path-param": {
            severity: "error",
            messages: {
                default: paramMessage `Path parameter '${"paramName"}' cannot be optional without a default value.`,
            },
        },
        "missing-server-param": {
            severity: "error",
            messages: {
                default: paramMessage `Server url contains parameter '${"param"}' but wasn't found in given parameters`,
            },
        },
        "duplicate-body": {
            severity: "error",
            messages: {
                default: "Operation has multiple @body parameters declared",
                duplicateUnannotated: "Operation has multiple unannotated parameters. There can only be one representing the body",
                bodyAndUnannotated: "Operation has a @body and an unannotated parameter. There can only be one representing the body",
            },
        },
        "duplicate-route-decorator": {
            severity: "error",
            messages: {
                operation: "@route was defined twice on this operation.",
                interface: "@route was defined twice on this interface.",
                namespace: "@route was defined twice on this namespace and has different values.",
            },
        },
        "operation-param-duplicate-type": {
            severity: "error",
            messages: {
                default: paramMessage `Param ${"paramName"} has multiple types: [${"types"}]`,
            },
        },
        "duplicate-operation": {
            severity: "error",
            messages: {
                default: paramMessage `Duplicate operation "${"operationName"}" routed at "${"verb"} ${"path"}".`,
            },
        },
        "status-code-invalid": {
            severity: "error",
            messages: {
                default: "statusCode value must be a numeric or string literal or union of numeric or string literals",
                value: "statusCode value must be a three digit code between 100 and 599",
            },
        },
        "content-type-string": {
            severity: "error",
            messages: {
                default: "contentType parameter must be a string literal or union of string literals",
            },
        },
        "duplicate-response": {
            severity: "error",
            messages: {
                default: paramMessage `Multiple return types for content type ${"contentType"} and status code ${"statusCode"}`,
            },
        },
        "content-type-ignored": {
            severity: "warning",
            messages: {
                default: "content-type header ignored because return type has no body",
            },
        },
        "no-routes": {
            severity: "warning",
            messages: {
                default: "Current spec is not exposing any routes. This could be to not having the service namespace marked with @serviceTitle.",
            },
        },
        "invalid-type-for-auth": {
            severity: "error",
            messages: {
                default: paramMessage `@useAuth ${"kind"} only accept Auth model, Tuple of auth model or union of auth model.`,
            },
        },
    },
};
const restLib = createCadlLibrary(libDefinition);
const { reportDiagnostic, createDiagnostic } = restLib;

/**
 * Extract params to be interpolated(Wrapped in '{' and '}'}) from a path/url.
 * @param path Path/Url
 *
 * @example "foo/{name}/bar" -> ["name"]
 */
function extractParamsFromPath(path) {
    var _a, _b;
    return (_b = (_a = path.match(/\{\w+\}/g)) === null || _a === void 0 ? void 0 : _a.map((s) => s.slice(1, -1))) !== null && _b !== void 0 ? _b : [];
}

const headerDecorator = createDecoratorDefinition({
    name: "@header",
    target: "ModelProperty",
    args: [{ kind: "String", optional: true }],
});
const headerFieldsKey = Symbol("header");
function $header(context, entity, headerName) {
    if (!headerDecorator.validate(context, entity, [headerName])) {
        return;
    }
    if (!headerName) {
        headerName = entity.name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }
    context.program.stateMap(headerFieldsKey).set(entity, headerName);
}
function getHeaderFieldName(program, entity) {
    return program.stateMap(headerFieldsKey).get(entity);
}
function isHeader(program, entity) {
    return program.stateMap(headerFieldsKey).has(entity);
}
const queryDecorator = createDecoratorDefinition({
    name: "@query",
    target: "ModelProperty",
    args: [{ kind: "String", optional: true }],
});
const queryFieldsKey = Symbol("query");
function $query(context, entity, queryKey) {
    if (!queryDecorator.validate(context, entity, [queryKey])) {
        return;
    }
    if (!queryKey && entity.kind === "ModelProperty") {
        queryKey = entity.name;
    }
    context.program.stateMap(queryFieldsKey).set(entity, queryKey);
}
function getQueryParamName(program, entity) {
    return program.stateMap(queryFieldsKey).get(entity);
}
function isQueryParam(program, entity) {
    return program.stateMap(queryFieldsKey).has(entity);
}
const pathDecorator = createDecoratorDefinition({
    name: "@path",
    target: "ModelProperty",
    args: [{ kind: "String", optional: true }],
});
const pathFieldsKey = Symbol("path");
function $path(context, entity, paramName) {
    if (!pathDecorator.validate(context, entity, [paramName])) {
        return;
    }
    context.program.stateMap(pathFieldsKey).set(entity, paramName !== null && paramName !== void 0 ? paramName : entity.name);
}
function getPathParamName(program, entity) {
    return program.stateMap(pathFieldsKey).get(entity);
}
function isPathParam(program, entity) {
    return program.stateMap(pathFieldsKey).has(entity);
}
const bodyDecorator = createDecoratorDefinition({
    name: "@body",
    target: "ModelProperty",
    args: [],
});
const bodyFieldsKey = Symbol("body");
function $body(context, entity) {
    if (!bodyDecorator.validate(context, entity, [])) {
        return;
    }
    context.program.stateSet(bodyFieldsKey).add(entity);
}
function isBody(program, entity) {
    return program.stateSet(bodyFieldsKey).has(entity);
}
const statusCodeDecorator = createDecoratorDefinition({
    name: "@statusCode",
    target: "ModelProperty",
    args: [],
});
const statusCodeKey = Symbol("statusCode");
function $statusCode(context, entity) {
    if (!statusCodeDecorator.validate(context, entity, [])) {
        return;
    }
    context.program.stateSet(statusCodeKey).add(entity);
    const codes = [];
    if (entity.type.kind === "String") {
        if (validStatusCode(context.program, entity.type.value, entity)) {
            codes.push(entity.type.value);
        }
    }
    else if (entity.type.kind === "Number") {
        if (validStatusCode(context.program, String(entity.type.value), entity)) {
            codes.push(String(entity.type.value));
        }
    }
    else if (entity.type.kind === "Union") {
        for (const option of entity.type.options) {
            if (option.kind === "String") {
                if (validStatusCode(context.program, option.value, option)) {
                    codes.push(option.value);
                }
            }
            else if (option.kind === "Number") {
                if (validStatusCode(context.program, String(option.value), option)) {
                    codes.push(String(option.value));
                }
            }
            else {
                reportDiagnostic(context.program, {
                    code: "status-code-invalid",
                    target: entity,
                });
            }
        }
    }
    else if (entity.type.kind === "TemplateParameter") ;
    else {
        reportDiagnostic(context.program, {
            code: "status-code-invalid",
            target: entity,
        });
    }
    setStatusCode(context.program, entity, codes);
}
function setStatusCode(program, entity, codes) {
    program.stateMap(statusCodeKey).set(entity, codes);
}
// Check status code value: 3 digits with first digit in [1-5]
// Issue a diagnostic if not valid
function validStatusCode(program, code, entity) {
    const statusCodePatten = /[1-5][0-9][0-9]/;
    if (code.match(statusCodePatten)) {
        return true;
    }
    reportDiagnostic(program, {
        code: "status-code-invalid",
        target: entity,
        messageId: "value",
    });
    return false;
}
function isStatusCode(program, entity) {
    return program.stateMap(statusCodeKey).has(entity);
}
function getStatusCodes(program, entity) {
    var _a;
    return (_a = program.stateMap(statusCodeKey).get(entity)) !== null && _a !== void 0 ? _a : [];
}
// Reference: https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
function getStatusCodeDescription(statusCode) {
    switch (statusCode) {
        case "200":
            return "The request has succeeded.";
        case "201":
            return "The request has succeeded and a new resource has been created as a result.";
        case "202":
            return "The request has been accepted for processing, but processing has not yet completed.";
        case "204":
            return "There is no content to send for this request, but the headers may be useful. ";
        case "301":
            return "The URL of the requested resource has been changed permanently. The new URL is given in the response.";
        case "304":
            return "The client has made a conditional request and the resource has not been modified.";
        case "400":
            return "The server could not understand the request due to invalid syntax.";
        case "401":
            return "Access is unauthorized.";
        case "403":
            return "Access is forbidden";
        case "404":
            return "The server cannot find the requested resource.";
        case "409":
            return "The request conflicts with the current state of the server.";
        case "412":
            return "Precondition failed.";
        case "503":
            return "Service unavailable.";
    }
    switch (statusCode.charAt(0)) {
        case "1":
            return "Informational";
        case "2":
            return "Successful";
        case "3":
            return "Redirection";
        case "4":
            return "Client Error";
        case "5":
            return "Server Error";
    }
    // Any valid HTTP status code is covered above.
    return undefined;
}
const operationVerbsKey = Symbol("verbs");
function setOperationVerb(program, entity, verb) {
    if (entity.kind === "Operation") {
        if (!program.stateMap(operationVerbsKey).has(entity)) {
            program.stateMap(operationVerbsKey).set(entity, verb);
        }
        else {
            reportDiagnostic(program, {
                code: "http-verb-duplicate",
                format: { entityName: entity.name },
                target: entity,
            });
        }
    }
    else {
        reportDiagnostic(program, {
            code: "http-verb-wrong-type",
            format: { verb, entityKind: entity.kind },
            target: entity,
        });
    }
}
function getOperationVerb(program, entity) {
    return program.stateMap(operationVerbsKey).get(entity);
}
function $get(context, entity, ...args) {
    validateVerbNoArgs(context, args);
    setOperationVerb(context.program, entity, "get");
}
function $put(context, entity, ...args) {
    validateVerbNoArgs(context, args);
    setOperationVerb(context.program, entity, "put");
}
function $post(context, entity, ...args) {
    validateVerbNoArgs(context, args);
    setOperationVerb(context.program, entity, "post");
}
function $patch(context, entity, ...args) {
    validateVerbNoArgs(context, args);
    setOperationVerb(context.program, entity, "patch");
}
function $delete(context, entity, ...args) {
    validateVerbNoArgs(context, args);
    setOperationVerb(context.program, entity, "delete");
}
function $head(context, entity, ...args) {
    validateVerbNoArgs(context, args);
    setOperationVerb(context.program, entity, "head");
}
// TODO: replace with built-in decorator validation https://github.com/Azure/cadl-azure/issues/1022
function validateVerbNoArgs(context, args) {
    validateDecoratorParamCount(context, 0, 0, args);
}
const serverDecoratorDefinition = createDecoratorDefinition({
    name: "@server",
    target: "Namespace",
    args: [{ kind: "String" }, { kind: "String" }, { kind: "Model", optional: true }],
});
const serversKey = Symbol("servers");
/**
 * Configure the server url for the service.
 * @param context Decorator context
 * @param target Decorator target(Must be a namespace)
 * @param description Description for this server.
 * @param parameters @optional Parameters to interpolate in the server url.
 */
function $server(context, target, url, description, parameters) {
    var _a;
    if (!serverDecoratorDefinition.validate(context, target, [url, description, parameters])) {
        return;
    }
    const params = extractParamsFromPath(url);
    const parameterMap = new Map((_a = parameters === null || parameters === void 0 ? void 0 : parameters.properties) !== null && _a !== void 0 ? _a : []);
    for (const declaredParam of params) {
        const param = parameterMap.get(declaredParam);
        if (!param) {
            reportDiagnostic(context.program, {
                code: "missing-server-param",
                format: { param: declaredParam },
                target: context.getArgumentTarget(0),
            });
            parameterMap.delete(declaredParam);
        }
    }
    let servers = context.program.stateMap(serversKey).get(target);
    if (servers === undefined) {
        servers = [];
        context.program.stateMap(serversKey).set(target, servers);
    }
    servers.push({
        url,
        description,
        parameters: parameterMap,
    });
}
function getServers(program, type) {
    return program.stateMap(serversKey).get(type);
}
function $plainData(context, entity) {
    if (!validateDecoratorTarget(context, entity, "@plainData", "Model")) {
        return;
    }
    const { program } = context;
    const decoratorsToRemove = ["$header", "$body", "$query", "$path", "$statusCode"];
    const [headers, bodies, queries, paths, statusCodes] = [
        program.stateMap(headerFieldsKey),
        program.stateSet(bodyFieldsKey),
        program.stateMap(queryFieldsKey),
        program.stateMap(pathFieldsKey),
        program.stateMap(statusCodeKey),
    ];
    for (const property of entity.properties.values()) {
        // Remove the decorators so that they do not run in the future, for example,
        // if this model is later spread into another.
        property.decorators = property.decorators.filter((d) => !decoratorsToRemove.includes(d.decorator.name));
        // Remove the impact the decorators already had on this model.
        headers.delete(property);
        bodies.delete(property);
        queries.delete(property);
        paths.delete(property);
        statusCodes.delete(property);
    }
}
setCadlNamespace("Private", $plainData);
const useAuthDecorator = createDecoratorDefinition({
    name: "@useAuth",
    target: "Namespace",
    args: [{ kind: ["Model", "Union", "Tuple"] }],
});
const authenticationKey = Symbol("authentication");
function $useAuth(context, serviceNamespace, authConfig) {
    if (!useAuthDecorator.validate(context, serviceNamespace, [authConfig])) {
        return;
    }
    const [auth, diagnostics] = extractServiceAuthentication(context.program, authConfig);
    if (diagnostics.length > 0)
        context.program.reportDiagnostics(diagnostics);
    if (auth !== undefined) {
        setAuthentication(context.program, serviceNamespace, auth);
    }
}
function setAuthentication(program, serviceNamespace, auth) {
    program.stateMap(authenticationKey).set(serviceNamespace, auth);
}
function extractServiceAuthentication(program, type) {
    const diagnostics = createDiagnosticCollector();
    switch (type.kind) {
        case "Model":
            const auth = diagnostics.pipe(extractHttpAuthentication(program, type, type));
            if (auth === undefined)
                return diagnostics.wrap(undefined);
            return diagnostics.wrap({ options: [{ schemes: [auth] }] });
        case "Tuple":
            const option = diagnostics.pipe(extractHttpAuthenticationOption(program, type, type));
            return diagnostics.wrap({ options: [option] });
        case "Union":
            return extractHttpAuthenticationOptions(program, type, type);
    }
}
function extractHttpAuthenticationOptions(program, tuple, diagnosticTarget) {
    const options = [];
    const diagnostics = createDiagnosticCollector();
    for (const value of tuple.options) {
        switch (value.kind) {
            case "Model":
                const result = diagnostics.pipe(extractHttpAuthentication(program, value, diagnosticTarget));
                if (result !== undefined) {
                    options.push({ schemes: [result] });
                }
                break;
            case "Tuple":
                const option = diagnostics.pipe(extractHttpAuthenticationOption(program, value, diagnosticTarget));
                options.push(option);
                break;
            default:
                diagnostics.add(createDiagnostic({
                    code: "invalid-type-for-auth",
                    format: { kind: value.kind },
                    target: value,
                }));
        }
    }
    return diagnostics.wrap({ options });
}
function extractHttpAuthenticationOption(program, tuple, diagnosticTarget) {
    const schemes = [];
    const diagnostics = createDiagnosticCollector();
    for (const value of tuple.values) {
        switch (value.kind) {
            case "Model":
                const result = diagnostics.pipe(extractHttpAuthentication(program, value, diagnosticTarget));
                if (result !== undefined) {
                    schemes.push(result);
                }
                break;
            default:
                diagnostics.add(createDiagnostic({
                    code: "invalid-type-for-auth",
                    format: { kind: value.kind },
                    target: value,
                }));
        }
    }
    return diagnostics.wrap({ schemes });
}
function extractHttpAuthentication(program, modelType, diagnosticTarget) {
    const [result, diagnostics] = cadlTypeToJson(modelType, diagnosticTarget);
    if (result === undefined) {
        return [result, diagnostics];
    }
    const description = getDoc(program, modelType);
    return [
        {
            ...result,
            id: modelType.name || result.type,
            ...(description && { description }),
        },
        diagnostics,
    ];
}
function getAuthentication(program, namespace) {
    return program.stateMap(authenticationKey).get(namespace);
}

/**
 * Get the responses for a given operation.
 */
function getResponsesForOperation(program, operation) {
    const diagnostics = createDiagnosticCollector();
    const responseType = operation.returnType;
    const responses = {};
    if (responseType.kind === "Union") {
        for (const option of responseType.options) {
            if (isNullType(program, option)) {
                // TODO how should we treat this? https://github.com/microsoft/cadl/issues/356
                continue;
            }
            processResponseType(program, diagnostics, responses, option);
        }
    }
    else {
        processResponseType(program, diagnostics, responses, responseType);
    }
    return diagnostics.wrap(Object.values(responses));
}
function isNullType(program, type) {
    return isIntrinsic(program, type) && getIntrinsicModelName(program, type) === "null";
}
function processResponseType(program, diagnostics, responses, responseModel) {
    var _a;
    // Get explicity defined status codes
    const statusCodes = getResponseStatusCodes(program, responseModel);
    // Get explicitly defined content types
    const contentTypes = getResponseContentTypes(program, diagnostics, responseModel);
    // Get response headers
    const headers = getResponseHeaders(program, responseModel);
    // Get explicitly defined body
    let bodyModel = getResponseBody(program, diagnostics, responseModel);
    // If there is no explicit body, it should be conjured from the return type
    // if it is a primitive type or it contains more than just response metadata
    if (!bodyModel) {
        if (responseModel.kind === "Model") {
            if (isIntrinsic(program, responseModel) || isArrayModelType(program, responseModel)) {
                bodyModel = responseModel;
            }
            else {
                const isResponseMetadata = (p) => isHeader(program, p) || isStatusCode(program, p);
                const allProperties = (p) => {
                    return [...p.properties.values(), ...(p.baseModel ? allProperties(p.baseModel) : [])];
                };
                if (allProperties(responseModel).some((p) => !isResponseMetadata(p)) ||
                    responseModel.derivedModels.length > 0) {
                    bodyModel = responseModel;
                }
            }
        }
        else {
            // body is array or possibly something else
            bodyModel = responseModel;
        }
    }
    // If there is no explicit status code, check if it should be 204
    if (statusCodes.length === 0) {
        if (bodyModel === undefined || isVoidType(bodyModel)) {
            bodyModel = undefined;
            statusCodes.push("204");
        }
        else if (isErrorModel(program, responseModel)) {
            statusCodes.push("*");
        }
        else {
            statusCodes.push("200");
        }
    }
    // If there is a body but no explicit content types, use application/json
    if (bodyModel && contentTypes.length === 0) {
        contentTypes.push("application/json");
    }
    // Put them into currentEndpoint.responses
    for (const statusCode of statusCodes) {
        // the first model for this statusCode/content type pair carries the
        // description for the endpoint. This could probably be improved.
        const response = (_a = responses[statusCode]) !== null && _a !== void 0 ? _a : {
            statusCode: statusCode,
            type: responseModel,
            description: getResponseDescription(program, responseModel, statusCode, bodyModel),
            responses: [],
        };
        // check for duplicates
        for (const contentType of contentTypes) {
            if (response.responses.find((x) => { var _a; return (_a = x.body) === null || _a === void 0 ? void 0 : _a.contentTypes.includes(contentType); })) {
                diagnostics.add(createDiagnostic({
                    code: "duplicate-response",
                    format: { statusCode: statusCode.toString(), contentType },
                    target: responseModel,
                }));
            }
        }
        if (bodyModel !== undefined) {
            response.responses.push({ body: { contentTypes: contentTypes, type: bodyModel }, headers });
        }
        else if (contentTypes.length > 0) {
            diagnostics.add(createDiagnostic({
                code: "content-type-ignored",
                target: responseModel,
            }));
        }
        else {
            response.responses.push({ headers });
        }
        responses[statusCode] = response;
    }
}
/**
 * Get explicity defined status codes from response Model
 * Return is an array of strings, possibly empty, which indicates no explicitly defined status codes.
 * We do not check for duplicates here -- that will be done by the caller.
 */
function getResponseStatusCodes(program, responseModel) {
    const codes = [];
    if (responseModel.kind === "Model") {
        if (responseModel.baseModel) {
            codes.push(...getResponseStatusCodes(program, responseModel.baseModel));
        }
        codes.push(...getStatusCodes(program, responseModel));
        for (const prop of responseModel.properties.values()) {
            if (isStatusCode(program, prop)) {
                codes.push(...getStatusCodes(program, prop));
            }
        }
    }
    return codes;
}
/**
 * Get explicity defined content-types from response Model
 * Return is an array of strings, possibly empty, which indicates no explicitly defined content-type.
 * We do not check for duplicates here -- that will be done by the caller.
 */
function getResponseContentTypes(program, diagnostics, responseModel) {
    const contentTypes = [];
    if (responseModel.kind === "Model") {
        if (responseModel.baseModel) {
            contentTypes.push(...getResponseContentTypes(program, diagnostics, responseModel.baseModel));
        }
        for (const prop of responseModel.properties.values()) {
            if (isHeader(program, prop)) {
                const headerName = getHeaderFieldName(program, prop);
                if (headerName && headerName.toLowerCase() === "content-type") {
                    contentTypes.push(...diagnostics.pipe(getContentTypes(prop)));
                }
            }
        }
    }
    return contentTypes;
}
/**
 * Resolve the content types from a model property by looking at the value.
 * @property property Model property
 * @returns List of contnet types and any diagnostics if there was an issue.
 */
function getContentTypes(property) {
    const diagnostics = createDiagnosticCollector();
    if (property.type.kind === "String") {
        return [[property.type.value], []];
    }
    else if (property.type.kind === "Union") {
        const contentTypes = [];
        for (const option of property.type.options) {
            if (option.kind === "String") {
                contentTypes.push(option.value);
            }
            else {
                diagnostics.add(createDiagnostic({
                    code: "content-type-string",
                    target: property,
                }));
                continue;
            }
        }
        return diagnostics.wrap(contentTypes);
    }
    return [[], [createDiagnostic({ code: "content-type-string", target: property })]];
}
/**
 * Get response headers from response Model
 */
function getResponseHeaders(program, responseModel) {
    if (responseModel.kind === "Model") {
        const responseHeaders = responseModel.baseModel
            ? getResponseHeaders(program, responseModel.baseModel)
            : {};
        for (const prop of responseModel.properties.values()) {
            const headerName = getHeaderFieldName(program, prop);
            if (isHeader(program, prop) && headerName !== "content-type") {
                responseHeaders[headerName] = prop;
            }
        }
        return responseHeaders;
    }
    return {};
}
function getResponseBody(program, diagnostics, responseModel) {
    if (responseModel.kind === "Model") {
        if (isArrayModelType(program, responseModel)) {
            return undefined;
        }
        const getAllBodyProps = (m) => {
            const bodyProps = [...m.properties.values()].filter((t) => isBody(program, t));
            if (m.baseModel) {
                bodyProps.push(...getAllBodyProps(m.baseModel));
            }
            return bodyProps;
        };
        const bodyProps = getAllBodyProps(responseModel);
        if (bodyProps.length > 0) {
            // Report all but first body as duplicate
            for (const prop of bodyProps.slice(1)) {
                diagnostics.add(createDiagnostic({ code: "duplicate-body", target: prop }));
            }
            return bodyProps[0].type;
        }
    }
    return undefined;
}
function getResponseDescription(program, responseType, statusCode, bodyType) {
    // NOTE: If the response type is an envelope and not the same as the body
    // type, then use its @doc as the response description. However, if the
    // response type is the same as the body type, then use the default status
    // code description and don't duplicate the schema description of the body
    // as the response description. This allows more freedom to change how
    // Cadl is expressed in semantically equivalent ways without causing
    // the output to change unnecessarily.
    if (responseType !== bodyType) {
        const desc = getDoc(program, responseType);
        if (desc) {
            return desc;
        }
    }
    return getStatusCodeDescription(statusCode);
}

const resourceKeysKey = Symbol("resourceKeys");
const resourceTypeForKeyParamKey = Symbol("resourceTypeForKeyParam");
function setResourceTypeKey(program, resourceType, keyProperty) {
    program.stateMap(resourceKeysKey).set(resourceType, {
        resourceType,
        keyProperty,
    });
}
function getResourceTypeKey(program, resourceType) {
    // Look up the key first
    let resourceKey = program.stateMap(resourceKeysKey).get(resourceType);
    if (resourceKey) {
        return resourceKey;
    }
    // Try to find it in the resource type
    resourceType.properties.forEach((p) => {
        if (isKey(program, p)) {
            if (resourceKey) {
                reportDiagnostic(program, {
                    code: "duplicate-key",
                    format: {
                        resourceName: resourceType.name,
                    },
                    target: p,
                });
            }
            else {
                resourceKey = {
                    resourceType,
                    keyProperty: p,
                };
                // Cache the key for future queries
                setResourceTypeKey(program, resourceType, resourceKey.keyProperty);
            }
        }
    });
    return resourceKey;
}
function $resourceTypeForKeyParam(context, entity, resourceType) {
    if (!validateDecoratorTarget(context, entity, "@resourceTypeForKeyParam", "ModelProperty")) {
        return;
    }
    context.program.stateMap(resourceTypeForKeyParamKey).set(entity, resourceType);
}
function getResourceTypeForKeyParam(program, param) {
    return program.stateMap(resourceTypeForKeyParamKey).get(param);
}
function cloneKeyProperties(context, target, resourceType) {
    const { program } = context;
    // Add parent keys first
    const parentType = getParentResource(program, resourceType);
    if (parentType) {
        cloneKeyProperties(context, target, parentType);
    }
    const resourceKey = getResourceTypeKey(program, resourceType);
    if (resourceKey) {
        const { keyProperty } = resourceKey;
        const keyName = getKeyName(program, keyProperty);
        // Filter out the @visibility decorator because it might affect metadata
        // filtering
        const decorators = [
            ...keyProperty.decorators.filter((d) => d.decorator !== $visibility),
            {
                decorator: $path,
                args: [],
            },
            {
                decorator: $resourceTypeForKeyParam,
                args: [{ node: target.node, value: resourceType }],
            },
        ];
        // Clone the key property and ensure that an optional key property doesn't
        // become an optional path parameter
        const newProp = program.checker.cloneType(keyProperty, {
            name: keyName,
            decorators,
            optional: false,
        });
        // Add the key property to the target type
        target.properties.set(keyName, newProp);
    }
}
function $copyResourceKeyParameters(context, entity, filter) {
    if (!validateDecoratorTarget(context, entity, "@copyResourceKeyParameters", "Model")) {
        return;
    }
    const reportNoKeyError = () => reportDiagnostic(context.program, {
        code: "not-key-type",
        target: entity,
    });
    const templateArguments = entity.templateArguments;
    if (!templateArguments || templateArguments.length !== 1) {
        return reportNoKeyError();
    }
    if (templateArguments[0].kind !== "Model") {
        if (isErrorType(templateArguments[0])) {
            return;
        }
        return reportNoKeyError();
    }
    const resourceType = templateArguments[0];
    if (filter === "parent") {
        // Only copy keys of the parent type if there is one
        const parentType = getParentResource(context.program, resourceType);
        if (parentType) {
            cloneKeyProperties(context, entity, parentType);
        }
    }
    else {
        // Copy keys of the resource type and all parents
        cloneKeyProperties(context, entity, resourceType);
    }
}
const parentResourceTypesKey = Symbol("parentResourceTypes");
function getParentResource(program, resourceType) {
    return program.stateMap(parentResourceTypesKey).get(resourceType);
}
/**
 * `@parentResource` marks a model with a reference to its parent resource type
 *
 * The first argument should be a reference to a model type which will be treated as the parent
 * type of the target model type.  This will cause the `@key` properties of all parent types of
 * the target type to show up in operations of the `Resource*<T>` interfaces defined in this library.
 *
 * `@parentResource` can only be applied to models.
 */
function $parentResource(context, entity, parentType) {
    if (!validateDecoratorTarget(context, parentType, "@parentResource", "Model")) {
        return;
    }
    const { program } = context;
    program.stateMap(parentResourceTypesKey).set(entity, parentType);
    // Ensure that the parent resource type(s) don't have key name conflicts
    const keyNameSet = new Set();
    let currentType = entity;
    while (currentType) {
        const resourceKey = getResourceTypeKey(program, currentType);
        const keyName = getKeyName(program, resourceKey.keyProperty);
        if (keyNameSet.has(keyName)) {
            reportDiagnostic(program, {
                code: "duplicate-parent-key",
                format: {
                    resourceName: entity.name,
                    parentName: currentType.name,
                    keyName,
                },
                target: resourceKey.keyProperty,
            });
            return;
        }
        keyNameSet.add(keyName);
        currentType = getParentResource(program, currentType);
    }
}

const producesTypesKey = Symbol("producesTypes");
const producesDecorator = createDecoratorDefinition({
    name: "@produces",
    target: "Namespace",
    args: [],
    spreadArgs: {
        kind: "String",
    },
});
function $produces(context, entity, ...contentTypes) {
    if (!producesDecorator.validate(context, entity, contentTypes)) {
        return;
    }
    const values = getProduces(context.program, entity);
    context.program.stateMap(producesTypesKey).set(entity, values.concat(contentTypes));
}
function getProduces(program, entity) {
    return program.stateMap(producesTypesKey).get(entity) || [];
}
const consumesTypesKey = Symbol("consumesTypes");
const consumeDefinition = createDecoratorDefinition({
    name: "@consumes",
    target: "Namespace",
    args: [],
    spreadArgs: {
        kind: "String",
    },
});
function $consumes(context, entity, ...contentTypes) {
    if (!consumeDefinition.validate(context, entity, contentTypes)) {
        return;
    }
    const values = getConsumes(context.program, entity);
    context.program.stateMap(consumesTypesKey).set(entity, values.concat(contentTypes));
}
function getConsumes(program, entity) {
    return program.stateMap(consumesTypesKey).get(entity) || [];
}
const discriminatorKey = Symbol("discriminator");
const discriminatorDecorator = createDecoratorDefinition({
    name: "@discriminator",
    target: "Model",
    args: [{ kind: "String" }],
});
function $discriminator(context, entity, propertyName) {
    if (!discriminatorDecorator.validate(context, entity, [propertyName])) {
        return;
    }
    context.program.stateMap(discriminatorKey).set(entity, propertyName);
}
function getDiscriminator(program, entity) {
    const propertyName = program.stateMap(discriminatorKey).get(entity);
    if (propertyName) {
        return { propertyName };
    }
    return undefined;
}
const segmentDecorator = createDecoratorDefinition({
    name: "@segment",
    target: ["Model", "ModelProperty", "Operation"],
    args: [{ kind: "String" }],
});
const segmentsKey = Symbol("segments");
/**
 * `@segment` defines the preceding path segment for a `@path` parameter in auto-generated routes
 *
 * The first argument should be a string that will be inserted into the operation route before the
 * path parameter's name field.
 *
 * `@segment` can only be applied to model properties, operation parameters, or operations.
 */
function $segment(context, entity, name) {
    if (!segmentDecorator.validate(context, entity, [name])) {
        return;
    }
    context.program.stateMap(segmentsKey).set(entity, name);
}
function getResourceSegment(program, resourceType) {
    // Add path segment for resource type key (if it has one)
    const resourceKey = getResourceTypeKey(program, resourceType);
    return resourceKey
        ? getSegment(program, resourceKey.keyProperty)
        : getSegment(program, resourceType);
}
const segmentOfDecorator = createDecoratorDefinition({
    name: "@segmentOf",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $segmentOf(context, entity, resourceType) {
    if (resourceType.kind === "TemplateParameter") {
        // Skip it, this operation is in a templated interface
        return;
    }
    if (!segmentOfDecorator.validate(context, entity, [resourceType])) {
        return;
    }
    // Add path segment for resource type key (if it has one)
    const segment = getResourceSegment(context.program, resourceType);
    if (segment) {
        context.call($segment, entity, segment);
    }
}
function getSegment(program, entity) {
    return program.stateMap(segmentsKey).get(entity);
}
const segmentSeparatorsKey = Symbol("segmentSeparators");
const segmentSeparatorDecorator = createDecoratorDefinition({
    name: "@segmentSeparator",
    target: ["Model", "ModelProperty", "Operation"],
    args: [{ kind: "String" }],
});
/**
 * `@segmentSeparator` defines the separator string that is inserted between the target's
 * `@segment` and the preceding route path in auto-generated routes.
 *
 * The first argument should be a string that will be inserted into the operation route before the
 * target's `@segment` value.  Can be a string of any length.  Defaults to `/`.
 *
 * `@segmentSeparator` can only be applied to model properties, operation parameters, or operations.
 */
function $segmentSeparator(context, entity, separator) {
    if (!segmentSeparatorDecorator.validate(context, entity, [separator])) {
        return;
    }
    context.program.stateMap(segmentSeparatorsKey).set(entity, separator);
}
function getSegmentSeparator(program, entity) {
    return program.stateMap(segmentSeparatorsKey).get(entity);
}
const resourceDecorator = createDecoratorDefinition({
    name: "@resource",
    target: "Model",
    args: [{ kind: "String" }],
});
/**
 * `@resource` marks a model as a resource type.
 *
 * The first argument should be the name of the collection that the resources
 * belong to.  For example, a resource type `Widget` might have a collection
 * name of `widgets`.
 *
 * `@resource` can only be applied to models.
 */
function $resource(context, entity, collectionName) {
    if (!resourceDecorator.validate(context, entity, [collectionName])) {
        return;
    }
    // Ensure type has a key property
    const key = getResourceTypeKey(context.program, entity);
    // A resource type must have a key property
    if (!key) {
        reportDiagnostic(context.program, {
            code: "resource-missing-key",
            format: {
                modelName: entity.name,
            },
            target: entity,
        });
        return;
    }
    // Apply the @segment decorator with the collection name
    context.call($segment, key.keyProperty, collectionName);
    // Manually push the decorator onto the property so that it's copyable in KeysOf<T>
    key.keyProperty.decorators.push({
        decorator: $segment,
        args: [{ value: collectionName }],
    });
}
const resourceOperationsKey = Symbol("resourceOperations");
function setResourceOperation(context, entity, resourceType, operation, decorator) {
    if (resourceType.kind === "TemplateParameter") {
        // Skip it, this operation is in a templated interface
        return;
    }
    if (!decorator.validate(context, entity, [resourceType])) {
        return;
    }
    context.program.stateMap(resourceOperationsKey).set(entity, {
        operation,
        resourceType,
    });
}
function getResourceOperation(program, cadlOperation) {
    return program.stateMap(resourceOperationsKey).get(cadlOperation);
}
const readsResourceDecorator = createDecoratorDefinition({
    name: "@readsResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $readsResource(context, entity, resourceType) {
    setResourceOperation(context, entity, resourceType, "read", readsResourceDecorator);
}
const createsResourceDecorator = createDecoratorDefinition({
    name: "@createsResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $createsResource(context, entity, resourceType) {
    // Add path segment for resource type key
    context.call($segmentOf, entity, resourceType);
    setResourceOperation(context, entity, resourceType, "create", createsResourceDecorator);
}
const createsOrReplacesResourceDecorator = createDecoratorDefinition({
    name: "@createsOrReplacesResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $createsOrReplacesResource(context, entity, resourceType) {
    setResourceOperation(context, entity, resourceType, "createOrReplace", createsOrReplacesResourceDecorator);
}
const createsOrUpdatesResourceDecorator = createDecoratorDefinition({
    name: "@createsOrUpdatesResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $createsOrUpdatesResource(context, entity, resourceType) {
    setResourceOperation(context, entity, resourceType, "createOrUpdate", createsOrUpdatesResourceDecorator);
}
const updatesResourceDecorator = createDecoratorDefinition({
    name: "@updatesResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $updatesResource(context, entity, resourceType) {
    setResourceOperation(context, entity, resourceType, "update", updatesResourceDecorator);
}
const deletesResourceDecorator = createDecoratorDefinition({
    name: "@deletesResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $deletesResource(context, entity, resourceType) {
    setResourceOperation(context, entity, resourceType, "delete", deletesResourceDecorator);
}
const listsResourceDecorator = createDecoratorDefinition({
    name: "@listsResource",
    target: "Operation",
    args: [{ kind: "Model" }],
});
function $listsResource(context, entity, resourceType) {
    // Add the @list decorator too so that collection routes are generated correctly
    context.call($list, entity, resourceType);
    // Add path segment for resource type key
    context.call($segmentOf, entity, resourceType);
    setResourceOperation(context, entity, resourceType, "list", listsResourceDecorator);
}
function lowerCaseFirstChar(str) {
    return str[0].toLocaleLowerCase() + str.substring(1);
}
function makeActionName(op, name) {
    return lowerCaseFirstChar(name || op.name);
}
const actionDecorator = createDecoratorDefinition({
    name: "@action",
    target: "Operation",
    args: [{ kind: "String", optional: true }],
});
const actionsKey = Symbol("actions");
function $action(context, entity, name) {
    if (!actionDecorator.validate(context, entity, [name])) {
        return;
    }
    // Generate the action name and add it as an operation path segment
    const action = makeActionName(entity, name);
    context.call($segment, entity, action);
    context.program.stateMap(actionsKey).set(entity, action);
}
function getAction(program, operation) {
    return program.stateMap(actionsKey).get(operation);
}
const collectionActionsKey = Symbol("collectionActions");
const collectionActionDecorator = createDecoratorDefinition({
    name: "@collectionAction",
    target: "Operation",
    args: [{ kind: "Model" }, { kind: "String", optional: true }],
});
function $collectionAction(context, entity, resourceType, name) {
    var _a;
    if (resourceType.kind === "TemplateParameter") {
        // Skip it, this operation is in a templated interface
        return;
    }
    if (!collectionActionDecorator.validate(context, entity, [resourceType, name])) {
        return;
    }
    // Generate the segment for the collection combined with the action's name
    const segment = getResourceSegment(context.program, resourceType);
    const segmentSeparator = (_a = getSegmentSeparator(context.program, entity)) !== null && _a !== void 0 ? _a : "/";
    const action = `${segment}${segmentSeparator}${makeActionName(entity, name)}`;
    context.call($segment, entity, action);
    // Replace the previous segment separator with slash so that it doesn't get repeated
    context.call($segmentSeparator, entity, "/");
    context.program.stateMap(collectionActionsKey).set(entity, action);
}
function getCollectionAction(program, operation) {
    return program.stateMap(collectionActionsKey).get(operation);
}
const resourceLocationsKey = Symbol("resourceLocations");
const resourceLocationDecorator = createDecoratorDefinition({
    name: "@resourceLocation",
    target: "Model",
    args: [{ kind: "Model" }],
});
function $resourceLocation(context, entity, resourceType) {
    if (resourceType.kind === "TemplateParameter") {
        // Skip it, this operation is in a templated interface
        return;
    }
    if (!resourceLocationDecorator.validate(context, entity, [resourceType])) {
        return;
    }
    context.program.stateMap(resourceLocationsKey).set(entity, resourceType);
}
function getResourceLocationType(program, entity) {
    return program.stateMap(resourceLocationsKey).get(entity);
}
setCadlNamespace("Private", $resourceLocation);

/**
 * `@route` defines the relative route URI for the target operation
 *
 * The first argument should be a URI fragment that may contain one or more path parameter fields.
 * If the namespace or interface that contains the operation is also marked with a `@route` decorator,
 * it will be used as a prefix to the route URI of the operation.
 *
 * `@route` can only be applied to operations, namespaces, and interfaces.
 */
function $route(context, entity, path) {
    setRoute(context, entity, {
        path,
        isReset: false,
    });
}
function $routeReset(context, entity, path) {
    setRoute(context, entity, {
        path,
        isReset: true,
    });
}
const routeOptionsKey = Symbol("routeOptions");
function setRouteOptionsForNamespace(program, namespace, options) {
    program.stateMap(routeOptionsKey).set(namespace, options);
}
function getRouteOptionsForNamespace(program, namespace) {
    return program.stateMap(routeOptionsKey).get(namespace);
}
const routesKey = Symbol("routes");
function setRoute(context, entity, details) {
    if (!validateDecoratorTarget(context, entity, "@route", ["Namespace", "Interface", "Operation"])) {
        return;
    }
    const state = context.program.stateMap(routesKey);
    if (state.has(entity)) {
        if (entity.kind === "Operation" || entity.kind === "Interface") {
            reportDiagnostic(context.program, {
                code: "duplicate-route-decorator",
                messageId: entity.kind === "Operation" ? "operation" : "interface",
                target: entity,
            });
        }
        else {
            const existingValue = state.get(entity);
            if (existingValue.path !== details.path) {
                reportDiagnostic(context.program, {
                    code: "duplicate-route-decorator",
                    messageId: "namespace",
                    target: entity,
                });
            }
        }
    }
    else {
        state.set(entity, details);
    }
}
function getRoutePath(program, entity) {
    return program.stateMap(routesKey).get(entity);
}
// The set of allowed segment separator characters
const AllowedSegmentSeparators = ["/", ":"];
function normalizeFragment(fragment) {
    if (fragment.length > 0 && AllowedSegmentSeparators.indexOf(fragment[0]) < 0) {
        // Insert the default separator
        fragment = `/${fragment}`;
    }
    // Trim any trailing slash
    return fragment.replace(/\/$/g, "");
}
function buildPath(pathFragments) {
    // Join all fragments with leading and trailing slashes trimmed
    const path = pathFragments.length === 0
        ? "/"
        : pathFragments
            .map(normalizeFragment)
            .filter((x) => x !== "")
            .join("");
    // The final path must start with a '/'
    return path.length > 0 && path[0] === "/" ? path : `/${path}`;
}
function addSegmentFragment(program, target, pathFragments) {
    // Don't add the segment prefix if it is meant to be excluded
    // (empty string means exclude the segment)
    const segment = getSegment(program, target);
    const separator = getSegmentSeparator(program, target);
    if (segment && segment !== "") {
        pathFragments.push(`${separator !== null && separator !== void 0 ? separator : "/"}${segment}`);
    }
}
function getOperationParameters(program, operation) {
    const diagnostics = createDiagnosticCollector();
    const result = {
        parameters: [],
    };
    const unannotatedParams = new Set();
    for (const param of operation.parameters.properties.values()) {
        const queryParam = getQueryParamName(program, param);
        const pathParam = getPathParamName(program, param);
        const headerParam = getHeaderFieldName(program, param);
        const bodyParam = isBody(program, param);
        const defined = [
            ["query", queryParam],
            ["path", pathParam],
            ["header", headerParam],
            ["body", bodyParam],
        ].filter((x) => !!x[1]);
        if (defined.length >= 2) {
            diagnostics.add(createDiagnostic({
                code: "operation-param-duplicate-type",
                format: { paramName: param.name, types: defined.map((x) => x[0]).join(", ") },
                target: param,
            }));
        }
        if (queryParam) {
            result.parameters.push({ type: "query", name: queryParam, param });
        }
        else if (pathParam) {
            if (param.optional && param.default === undefined) {
                reportDiagnostic(program, {
                    code: "optional-path-param",
                    format: { paramName: param.name },
                    target: operation,
                });
            }
            result.parameters.push({ type: "path", name: pathParam, param });
        }
        else if (headerParam) {
            result.parameters.push({ type: "header", name: headerParam, param });
        }
        else if (bodyParam) {
            if (result.bodyType === undefined) {
                result.bodyParameter = param;
                result.bodyType = param.type;
            }
            else {
                diagnostics.add(createDiagnostic({ code: "duplicate-body", target: param }));
            }
        }
        else {
            unannotatedParams.add(param);
        }
    }
    if (unannotatedParams.size > 0) {
        if (result.bodyType === undefined) {
            result.bodyType = program.checker.filterModelProperties(operation.parameters, (p) => unannotatedParams.has(p));
        }
        else {
            diagnostics.add(createDiagnostic({
                code: "duplicate-body",
                messageId: "bodyAndUnannotated",
                target: operation,
            }));
        }
    }
    return diagnostics.wrap(result);
}
function generatePathFromParameters(program, operation, pathFragments, parameters, options) {
    var _a, _b;
    const filteredParameters = [];
    for (const httpParam of parameters.parameters) {
        const { type, param } = httpParam;
        if (type === "path") {
            addSegmentFragment(program, param, pathFragments);
            const filteredParam = (_b = (_a = options.autoRouteOptions) === null || _a === void 0 ? void 0 : _a.routeParamFilter) === null || _b === void 0 ? void 0 : _b.call(_a, operation, param);
            if (filteredParam === null || filteredParam === void 0 ? void 0 : filteredParam.routeParamString) {
                pathFragments.push(`/${filteredParam.routeParamString}`);
                if ((filteredParam === null || filteredParam === void 0 ? void 0 : filteredParam.excludeFromOperationParams) === true) {
                    // Skip the rest of the loop so that we don't add the parameter to the final list
                    continue;
                }
            }
            else {
                // Add the path variable for the parameter
                if (param.type.kind === "String") {
                    pathFragments.push(`/${param.type.value}`);
                    continue; // Skip adding to the parameter list
                }
                else {
                    pathFragments.push(`/{${param.name}}`);
                }
            }
        }
        // Push all usable parameters to the filtered list
        filteredParameters.push(httpParam);
    }
    // Replace the original parameters with filtered set
    parameters.parameters = filteredParameters;
    // Add the operation's own segment if present
    addSegmentFragment(program, operation, pathFragments);
}
function getPathForOperation(program, diagnostics, operation, routeFragments, options) {
    const parameters = diagnostics.pipe(getOperationParameters(program, operation));
    const pathFragments = [...routeFragments];
    const routePath = getRoutePath(program, operation);
    if (isAutoRoute(program, operation)) {
        // The operation exists within an @autoRoute scope, generate the path.  This
        // mutates the pathFragments and parameters lists that are passed in!
        generatePathFromParameters(program, operation, pathFragments, parameters, options);
    }
    else {
        // Prepend any explicit route path
        if (routePath) {
            pathFragments.push(routePath.path);
        }
        // Pull out path parameters to verify what's in the path string
        const paramByName = new Map(parameters.parameters
            .filter(({ type }) => type === "path")
            .map(({ param }) => [param.name, param]));
        // Find path parameter names used in all route fragments
        const declaredPathParams = pathFragments.flatMap(extractParamsFromPath);
        // For each param in the declared path parameters (e.g. /foo/{id} has one, id),
        // delete it because it doesn't need to be added to the path.
        for (const declaredParam of declaredPathParams) {
            const param = paramByName.get(declaredParam);
            if (!param) {
                diagnostics.add(createDiagnostic({
                    code: "missing-path-param",
                    format: { param: declaredParam },
                    target: operation,
                }));
                continue;
            }
            paramByName.delete(declaredParam);
        }
        // Add any remaining declared path params
        for (const param of paramByName.keys()) {
            pathFragments.push(`{${param}}`);
        }
    }
    return {
        path: buildPath(pathFragments),
        pathFragment: routePath === null || routePath === void 0 ? void 0 : routePath.path,
        parameters,
    };
}
function getVerbForOperation(program, diagnostics, operation, parameters) {
    var _a, _b;
    const resourceOperation = getResourceOperation(program, operation);
    const verb = (_b = (_a = (resourceOperation && resourceOperationToVerb[resourceOperation.operation])) !== null && _a !== void 0 ? _a : getOperationVerb(program, operation)) !== null && _b !== void 0 ? _b : 
    // TODO: Enable this verb choice to be customized!
    (getAction(program, operation) || getCollectionAction(program, operation) ? "post" : undefined);
    if (verb !== undefined) {
        return verb;
    }
    // If no verb was found by this point, choose a verb based on whether there is
    // a body type for the request
    return parameters.bodyType ? "post" : "get";
}
function buildRoutes(program, diagnostics, container, routeFragments, visitedOperations, options) {
    var _a;
    if (container.kind === "Interface" && isTemplateDeclaration(container)) {
        // Skip template interface operations
        return [];
    }
    // Get the route info for this container, if any
    const baseRoute = getRoutePath(program, container);
    const parentFragments = [...routeFragments, ...(baseRoute ? [baseRoute.path] : [])];
    // TODO: Allow overriding the existing resource operation of the same kind
    const operations = [];
    for (const [_, op] of container.operations) {
        // Skip previously-visited operations
        if (visitedOperations.has(op)) {
            continue;
        }
        // Skip templated operations
        if (isTemplateDeclarationOrInstance(op)) {
            continue;
        }
        const route = getPathForOperation(program, diagnostics, op, parentFragments, options);
        const verb = getVerbForOperation(program, diagnostics, op, route.parameters);
        const responses = diagnostics.pipe(getResponsesForOperation(program, op));
        operations.push({
            path: route.path,
            pathFragment: route.pathFragment,
            verb,
            container,
            parameters: route.parameters,
            operation: op,
            responses,
        });
    }
    // Build all child routes and append them to the list, but don't recurse in
    // the global scope because that could pull in unwanted operations
    if (container.kind === "Namespace") {
        // If building routes for the global namespace we shouldn't navigate the sub namespaces.
        const includeSubNamespaces = isGlobalNamespace(program, container);
        const additionalInterfaces = (_a = getExternalInterfaces(program, container)) !== null && _a !== void 0 ? _a : [];
        const children = [
            ...(includeSubNamespaces ? [] : container.namespaces.values()),
            ...container.interfaces.values(),
            ...additionalInterfaces,
        ];
        const childRoutes = children.flatMap((child) => buildRoutes(program, diagnostics, child, parentFragments, visitedOperations, options));
        for (const child of childRoutes)
            [operations.push(child)];
    }
    return operations;
}
function getRoutesForContainer(program, container, visitedOperations, options) {
    var _a;
    const routeOptions = (_a = options !== null && options !== void 0 ? options : (container.kind === "Namespace" ? getRouteOptionsForNamespace(program, container) : {})) !== null && _a !== void 0 ? _a : {};
    const diagnostics = createDiagnosticCollector();
    return diagnostics.wrap(buildRoutes(program, diagnostics, container, [], visitedOperations, routeOptions));
}
const externalInterfaces = Symbol("externalInterfaces");
/**
 * @depreacted DO NOT USE. For internal use only as a workaround.
 * @param program Program
 * @param target Target namespace
 * @param interf Interface that should be included in namespace.
 */
function includeInterfaceRoutesInNamespace(program, target, sourceInterface) {
    let array = program.stateMap(externalInterfaces).get(target);
    if (array === undefined) {
        array = [];
        program.stateMap(externalInterfaces).set(target, array);
    }
    array.push(sourceInterface);
}
function getExternalInterfaces(program, namespace) {
    const interfaces = program.stateMap(externalInterfaces).get(namespace);
    if (interfaces === undefined) {
        return undefined;
    }
    return interfaces
        .map((interfaceFQN) => {
        let current = program.checker.getGlobalNamespaceType();
        const namespaces = interfaceFQN.split(".");
        const interfaceName = namespaces.pop();
        for (const namespaceName of namespaces) {
            current = current === null || current === void 0 ? void 0 : current.namespaces.get(namespaceName);
        }
        return current === null || current === void 0 ? void 0 : current.interfaces.get(interfaceName);
    })
        .filter((x) => x !== undefined);
}
function getAllRoutes(program, options) {
    let operations = [];
    const diagnostics = createDiagnosticCollector();
    const serviceNamespace = getServiceNamespace(program);
    const namespacesToExport = serviceNamespace ? [serviceNamespace] : [];
    const visitedOperations = new Set();
    for (const container of namespacesToExport) {
        const newOps = diagnostics.pipe(getRoutesForContainer(program, container, visitedOperations, options));
        // Make sure we don't visit the same operations again
        newOps.forEach((o) => visitedOperations.add(o.operation));
        // Accumulate the new operations
        operations = [...operations, ...newOps];
    }
    validateRouteUnique(diagnostics, operations);
    return diagnostics.wrap(operations);
}
function reportIfNoRoutes(program, routes) {
    if (routes.length === 0) {
        reportDiagnostic(program, {
            code: "no-routes",
            target: program.checker.getGlobalNamespaceType(),
        });
    }
}
function validateRouteUnique(diagnostics, operations) {
    const grouped = new Map();
    for (const operation of operations) {
        const { verb, path } = operation;
        let map = grouped.get(path);
        if (map === undefined) {
            map = new Map();
            grouped.set(path, map);
        }
        let list = map.get(verb);
        if (list === undefined) {
            list = [];
            map.set(verb, list);
        }
        list.push(operation);
    }
    for (const [path, map] of grouped) {
        for (const [verb, routes] of map) {
            if (routes.length >= 2) {
                for (const route of routes) {
                    diagnostics.add(createDiagnostic({
                        code: "duplicate-operation",
                        format: { path, verb, operationName: route.operation.name },
                        target: route.operation,
                    }));
                }
            }
        }
    }
}
// TODO: Make this overridable by libraries
const resourceOperationToVerb = {
    read: "get",
    create: "post",
    createOrUpdate: "patch",
    createOrReplace: "put",
    update: "patch",
    delete: "delete",
    list: "get",
};
const autoRouteKey = Symbol("autoRoute");
/**
 * `@autoRoute` enables automatic route generation for an operation, namespace, or interface.
 *
 * When applied to an operation, it automatically generates the operation's route based on path parameter
 * metadata.  When applied to a namespace or interface, it causes all operations under that scope to have
 * auto-generated routes.
 */
function $autoRoute(context, entity) {
    if (!validateDecoratorTarget(context, entity, "@autoRoute", ["Namespace", "Interface", "Operation"])) {
        return;
    }
    context.program.stateSet(autoRouteKey).add(entity);
}
function isAutoRoute(program, target) {
    // Loop up through parent scopes (interface, namespace) to see if
    // @autoRoute was used anywhere
    let current = target;
    while (current !== undefined) {
        if (program.stateSet(autoRouteKey).has(current)) {
            return true;
        }
        // Navigate up to the parent scope
        if (current.kind === "Namespace" || current.kind === "Interface") {
            current = current.namespace;
        }
        else if (current.kind === "Operation") {
            current = current.interface || current.namespace;
        }
    }
    return false;
}

const namespace = "Cadl.Http";

var f1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    namespace: namespace,
    $header: $header,
    getHeaderFieldName: getHeaderFieldName,
    isHeader: isHeader,
    $query: $query,
    getQueryParamName: getQueryParamName,
    isQueryParam: isQueryParam,
    $path: $path,
    getPathParamName: getPathParamName,
    isPathParam: isPathParam,
    $body: $body,
    isBody: isBody,
    $statusCode: $statusCode,
    setStatusCode: setStatusCode,
    isStatusCode: isStatusCode,
    getStatusCodes: getStatusCodes,
    getStatusCodeDescription: getStatusCodeDescription,
    getOperationVerb: getOperationVerb,
    $get: $get,
    $put: $put,
    $post: $post,
    $patch: $patch,
    $delete: $delete,
    $head: $head,
    $server: $server,
    getServers: getServers,
    $plainData: $plainData,
    $useAuth: $useAuth,
    setAuthentication: setAuthentication,
    getAuthentication: getAuthentication,
    getResponsesForOperation: getResponsesForOperation,
    getContentTypes: getContentTypes,
    $route: $route,
    $routeReset: $routeReset,
    setRouteOptionsForNamespace: setRouteOptionsForNamespace,
    getRoutePath: getRoutePath,
    getOperationParameters: getOperationParameters,
    getRoutesForContainer: getRoutesForContainer,
    includeInterfaceRoutesInNamespace: includeInterfaceRoutesInNamespace,
    getAllRoutes: getAllRoutes,
    reportIfNoRoutes: reportIfNoRoutes,
    $autoRoute: $autoRoute,
    isAutoRoute: isAutoRoute
});

export { $resourceTypeForKeyParam as $, $deletesResource as A, $listsResource as B, $action as C, getAction as D, $collectionAction as E, getCollectionAction as F, $resourceLocation as G, getResourceLocationType as H, getAllRoutes as I, reportDiagnostic as J, namespace as K, $header as L, getHeaderFieldName as M, isHeader as N, $query as O, getQueryParamName as P, isQueryParam as Q, $path as R, getPathParamName as S, isPathParam as T, $body as U, isBody as V, $statusCode as W, setStatusCode as X, isStatusCode as Y, getStatusCodes as Z, getStatusCodeDescription as _, getResourceTypeForKeyParam as a, getOperationVerb as a0, $get as a1, $put as a2, $post as a3, $patch as a4, $delete as a5, $head as a6, $server as a7, getServers as a8, $plainData as a9, $useAuth as aa, setAuthentication as ab, getAuthentication as ac, getResponsesForOperation as ad, getContentTypes as ae, $route as af, $routeReset as ag, setRouteOptionsForNamespace as ah, getRoutePath as ai, getOperationParameters as aj, getRoutesForContainer as ak, includeInterfaceRoutesInNamespace as al, reportIfNoRoutes as am, $autoRoute as an, isAutoRoute as ao, $copyResourceKeyParameters as b, getParentResource as c, $parentResource as d, $produces as e, f1 as f, getResourceTypeKey as g, getProduces as h, $consumes as i, getConsumes as j, $discriminator as k, getDiscriminator as l, $segment as m, $segmentOf as n, getSegment as o, $segmentSeparator as p, getSegmentSeparator as q, $resource as r, setResourceTypeKey as s, setResourceOperation as t, getResourceOperation as u, $readsResource as v, $createsResource as w, $createsOrReplacesResource as x, $createsOrUpdatesResource as y, $updatesResource as z };
