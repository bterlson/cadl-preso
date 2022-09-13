import { f as f1, s as setResourceTypeKey, g as getResourceTypeKey, $ as $resourceTypeForKeyParam, a as getResourceTypeForKeyParam, b as $copyResourceKeyParameters, c as getParentResource, d as $parentResource, e as $produces, h as getProduces, i as $consumes, j as getConsumes, k as $discriminator, l as getDiscriminator, m as $segment, n as $segmentOf, o as getSegment, p as $segmentSeparator, q as getSegmentSeparator, r as $resource, t as setResourceOperation, u as getResourceOperation, v as $readsResource, w as $createsResource, x as $createsOrReplacesResource, y as $createsOrUpdatesResource, z as $updatesResource, A as $deletesResource, B as $listsResource, C as $action, D as getAction, E as $collectionAction, F as getCollectionAction, G as $resourceLocation, H as getResourceLocationType, I as getAllRoutes, J as reportDiagnostic } from './index-cef92fa9.js';
export { C as $action, E as $collectionAction, i as $consumes, b as $copyResourceKeyParameters, x as $createsOrReplacesResource, y as $createsOrUpdatesResource, w as $createsResource, A as $deletesResource, k as $discriminator, B as $listsResource, d as $parentResource, e as $produces, v as $readsResource, r as $resource, G as $resourceLocation, $ as $resourceTypeForKeyParam, m as $segment, n as $segmentOf, p as $segmentSeparator, z as $updatesResource, D as getAction, F as getCollectionAction, j as getConsumes, l as getDiscriminator, c as getParentResource, h as getProduces, H as getResourceLocationType, u as getResourceOperation, a as getResourceTypeForKeyParam, g as getResourceTypeKey, o as getSegment, q as getSegmentSeparator, f as http, t as setResourceOperation, s as setResourceTypeKey } from './index-cef92fa9.js';
import { validateDecoratorParamType, isErrorModel } from '@cadl-lang/compiler';

const namespace$1 = "Cadl.Rest";

var f2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    namespace: namespace$1,
    http: f1,
    setResourceTypeKey: setResourceTypeKey,
    getResourceTypeKey: getResourceTypeKey,
    $resourceTypeForKeyParam: $resourceTypeForKeyParam,
    getResourceTypeForKeyParam: getResourceTypeForKeyParam,
    $copyResourceKeyParameters: $copyResourceKeyParameters,
    getParentResource: getParentResource,
    $parentResource: $parentResource,
    $produces: $produces,
    getProduces: getProduces,
    $consumes: $consumes,
    getConsumes: getConsumes,
    $discriminator: $discriminator,
    getDiscriminator: getDiscriminator,
    $segment: $segment,
    $segmentOf: $segmentOf,
    getSegment: getSegment,
    $segmentSeparator: $segmentSeparator,
    getSegmentSeparator: getSegmentSeparator,
    $resource: $resource,
    setResourceOperation: setResourceOperation,
    getResourceOperation: getResourceOperation,
    $readsResource: $readsResource,
    $createsResource: $createsResource,
    $createsOrReplacesResource: $createsOrReplacesResource,
    $createsOrUpdatesResource: $createsOrUpdatesResource,
    $updatesResource: $updatesResource,
    $deletesResource: $deletesResource,
    $listsResource: $listsResource,
    $action: $action,
    getAction: getAction,
    $collectionAction: $collectionAction,
    getCollectionAction: getCollectionAction,
    $resourceLocation: $resourceLocation,
    getResourceLocationType: getResourceLocationType
});

function $onValidate(program) {
    const [, diagnostics] = getAllRoutes(program);
    if (diagnostics.length > 0) {
        program.reportDiagnostics(diagnostics);
    }
}

var f0 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $onValidate: $onValidate
});

const namespace = "Cadl.Rest.Private";
const validatedMissingKey = Symbol("validatedMissing");
// Workaround for the lack of template constraints https://github.com/microsoft/cadl/issues/377
function $validateHasKey(context, target, value) {
    if (!validateDecoratorParamType(context.program, target, value, "Model")) {
        return;
    }
    if (context.program.stateSet(validatedMissingKey).has(value)) {
        return;
    }
    const resourceKey = getResourceTypeKey(context.program, value);
    if (resourceKey === undefined) {
        reportDiagnostic(context.program, {
            code: "resource-missing-key",
            format: { modelName: value.name },
            target: value,
        });
        context.program.stateSet(validatedMissingKey).add(value);
    }
}
const validatedErrorKey = Symbol("validatedError");
// Workaround for the lack of template constraints https://github.com/microsoft/cadl/issues/377
function $validateIsError(context, target, value) {
    if (!validateDecoratorParamType(context.program, target, value, "Model")) {
        return;
    }
    if (context.program.stateSet(validatedErrorKey).has(value)) {
        return;
    }
    const isError = isErrorModel(context.program, value);
    if (!isError) {
        reportDiagnostic(context.program, {
            code: "resource-missing-error",
            format: { modelName: value.name },
            target: value,
        });
        context.program.stateSet(validatedErrorKey).add(value);
    }
}

var f3 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    namespace: namespace,
    $validateHasKey: $validateHasKey,
    $validateIsError: $validateIsError
});

const CadlJSSources = {
"dist/src/validate.js": f0,
"dist/src/http/index.js": f1,
"dist/src/index.js": f2,
"dist/src/internal-decorators.js": f3,
};
const CadlSources = {
  "package.json": "{\"name\":\"@cadl-lang/rest\",\"version\":\"0.16.0\",\"author\":\"Microsoft Corporation\",\"description\":\"Cadl REST protocol binding\",\"homepage\":\"https://github.com/Microsoft/cadl\",\"readme\":\"https://github.com/Microsoft/cadl/blob/master/README.md\",\"license\":\"MIT\",\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/Microsoft/cadl.git\"},\"bugs\":{\"url\":\"https://github.com/Microsoft/cadl/issues\"},\"keywords\":[\"cadl\"],\"type\":\"module\",\"main\":\"dist/src/index.js\",\"cadlMain\":\"lib/rest.cadl\",\"exports\":{\".\":\"./dist/src/index.js\",\"./http\":\"./dist/src/http/index.js\",\"./testing\":\"./dist/src/testing/index.js\"},\"typesVersions\":{\"*\":{\"*\":[\"./dist/src/index.d.ts\"],\"http\":[\"./dist/src/http/index.d.ts\"],\"testing\":[\"./dist/src/testing/index.d.ts\"]}},\"engines\":{\"node\":\">=16.0.0\"},\"files\":[\"lib/*.cadl\",\"dist/**\",\"!dist/test/**\"],\"peerDependencies\":{\"@cadl-lang/compiler\":\"~0.34.0\"},\"devDependencies\":{\"@types/mocha\":\"~9.1.0\",\"@types/node\":\"~16.0.3\",\"@cadl-lang/compiler\":\"~0.34.0\",\"@cadl-lang/eslint-config-cadl\":\"~0.4.0\",\"@cadl-lang/library-linter\":\"~0.1.3\",\"@cadl-lang/eslint-plugin\":\"~0.1.1\",\"eslint\":\"^8.12.0\",\"mocha\":\"~9.2.0\",\"mocha-junit-reporter\":\"~2.0.2\",\"mocha-multi-reporters\":\"~1.5.1\",\"c8\":\"~7.11.0\",\"rimraf\":\"~3.0.2\",\"typescript\":\"~4.7.2\"},\"scripts\":{\"clean\":\"rimraf ./dist ./temp\",\"build\":\"tsc -p . && npm run lint-cadl-library\",\"watch\":\"tsc -p . --watch\",\"lint-cadl-library\":\"cadl compile . --warn-as-error --import @cadl-lang/library-linter --no-emit\",\"test\":\"mocha\",\"test-official\":\"c8 mocha --forbid-only --reporter mocha-multi-reporters\",\"lint\":\"eslint . --ext .ts --max-warnings=0\",\"lint:fix\":\"eslint . --fix --ext .ts\"}}",
  "../../../../cadl-azure/core/packages/compiler/lib/main.cadl": "import \"../dist/lib/decorators.js\";\nimport \"./lib.cadl\";\nimport \"./projected-names.cadl\";\n",
  "../../../../cadl-azure/core/packages/compiler/lib/lib.cadl": "namespace Cadl;\n\nmodel object {}\n\n@indexer(integer, T)\nmodel Array<T> {}\n\n@indexer(string, T)\nmodel Record<T> {}\n\n@intrinsic(\"bytes\")\nmodel bytes {}\n\n@numeric\n@intrinsic(\"numeric\")\nmodel numeric {}\n\n@numeric\n@intrinsic(\"integer\")\nmodel integer {}\n\n@numeric\n@intrinsic(\"float\")\nmodel float {}\n\n@numeric\n@intrinsic(\"int64\")\nmodel int64 {}\n\n@numeric\n@intrinsic(\"int32\")\nmodel int32 {}\n\n@numeric\n@intrinsic(\"int16\")\nmodel int16 {}\n\n@numeric\n@intrinsic(\"int8\")\nmodel int8 {}\n\n@numeric\n@intrinsic(\"uint64\")\nmodel uint64 {}\n\n@numeric\n@intrinsic(\"uint32\")\nmodel uint32 {}\n\n@numeric\n@intrinsic(\"uint16\")\nmodel uint16 {}\n\n@numeric\n@intrinsic(\"uint8\")\nmodel uint8 {}\n\n@numeric\n@intrinsic(\"safeint\")\nmodel safeint {}\n\n@numeric\n@intrinsic(\"float32\")\nmodel float32 {}\n\n@numeric\n@intrinsic(\"float64\")\nmodel float64 {}\n\n@intrinsic(\"string\")\nmodel string {}\n\n@intrinsic(\"plainDate\")\nmodel plainDate {}\n\n@intrinsic(\"plainTime\")\nmodel plainTime {}\n\n@intrinsic(\"zonedDateTime\")\nmodel zonedDateTime {}\n\n@intrinsic(\"duration\")\nmodel duration {}\n\n@intrinsic(\"boolean\")\nmodel boolean {}\n\n@intrinsic(\"null\")\nmodel null {}\n\n@deprecated(\"Map is deprecated, use Record<T> instead\")\nmodel Map<K, V> is Record<V>;\n\n@doc(\"The template for adding optional properties.\")\n@withOptionalProperties\nmodel OptionalProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for adding updateable properties.\")\n@withUpdateableProperties\nmodel UpdateableProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for omitting properties.\")\n@withoutOmittedProperties(TStringOrTuple)\nmodel OmitProperties<T, TStringOrTuple> {\n  ...T;\n}\n\n@withoutDefaultValues\nmodel OmitDefaults<T> {\n  ...T;\n}\n\n@doc(\"The template for setting the default visibility of key properties.\")\n@withDefaultKeyVisibility(Visibility)\nmodel DefaultKeyVisibility<T, Visibility> {\n  ...T;\n}\n",
  "../../../../cadl-azure/core/packages/compiler/lib/projected-names.cadl": "// Set of projections consuming the @projectedName decorator\n\n#suppress \"projections-are-experimental\"\nprojection op#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n",
  "lib/rest.cadl": "import \"../dist/src/validate.js\";\n\nimport \"./http.cadl\";\nimport \"./resource.cadl\";\n\nnamespace Cadl.Rest;\n\n@doc(\"The location of an instance of {name}\", TResource)\n@Private.resourceLocation(TResource)\nmodel ResourceLocation<TResource> is string;\n",
  "lib/http.cadl": "import \"../dist/src/http/index.js\";\nimport \"./auth.cadl\";\n\nnamespace Cadl.Http;\n\nusing Private;\n\nmodel Response<Status> {\n  @doc(\"The status code.\")\n  @statusCode\n  statusCode: Status;\n}\n\n/**\n * Defines a model with a single property of the given type, marked with `@body`.\n *\n * This can be useful in situations where you cannot use a bare T as the body\n * and it is awkward to add a property.\n */\nmodel Body<T> {\n  @body\n  body: T;\n}\n\nmodel LocationHeader {\n  @doc(\"The Location header contains the URL where the status of the long running operation can be checked.\")\n  @header\n  location: string;\n}\n\n// Don't put @doc on these, change `getStatusCodeDescription` implementation\n// to update the default descriptions for these status codes. This ensures\n// that we get consistent emit between different ways to spell the same\n// responses in Cadl.\nmodel OkResponse is Response<200>;\nmodel CreatedResponse is Response<201>;\nmodel AcceptedResponse is Response<202>;\nmodel NoContentResponse is Response<204>;\nmodel MovedResponse is Response<301> {\n  ...LocationHeader;\n}\nmodel NotModifiedResponse is Response<304>;\nmodel BadRequestResponse is Response<400>;\nmodel UnauthorizedResponse is Response<401>;\nmodel ForbiddenResponse is Response<403>;\nmodel NotFoundResponse is Response<404>;\nmodel ConflictResponse is Response<409>;\n\n/**\n * Produces a new model with the same properties as T, but with `@query`,\n *`@header`, `@body`, and `@path` decorators removed from all properties.\n */\n@plainData\nmodel PlainData<T> {\n  ...T;\n}\n",
  "lib/auth.cadl": "namespace Cadl.Http;\n\nenum AuthType {\n  http,\n  apiKey,\n  oauth2,\n  openIdConnect,\n}\n\n/**\n * Basic authentication is a simple authentication scheme built into the HTTP protocol.\n * The client sends HTTP requests with the Authorization header that contains the word Basic word followed by a space and a base64-encoded string username:password.\n * For example, to authorize as demo / p@55w0rd the client would send\n * ```\n *  Authorization: Basic ZGVtbzpwQDU1dzByZA==\n * ```\n */\nmodel BasicAuth {\n  type: AuthType.http;\n  scheme: \"basic\";\n}\n\n/**\n * Bearer authentication (also called token authentication) is an HTTP authentication scheme that involves security tokens called bearer tokens.\n * The name “Bearer authentication” can be understood as “give access to the bearer of this token.” The bearer token is a cryptic string, usually generated by the server in response to a login request.\n * The client must send this token in the Authorization header when making requests to protected resources:\n * ```\n *   Authorization: Bearer <token>\n * ```\n */\nmodel BearerAuth {\n  type: AuthType.http;\n  scheme: \"bearer\";\n}\n\nenum ApiKeyLocation {\n  header,\n  query,\n  cookie,\n}\n\n/**\n * An API key is a token that a client provides when making API calls. The key can be sent in the query string:\n * ```\n * GET /something?api_key=abcdef12345\n * ```\n *\n * or as a request header\n *\n * ```\n * GET /something HTTP/1.1\n * X-API-Key: abcdef12345\n * ```\n *\n * or as a cookie\n *\n * ```\n * GET /something HTTP/1.1\n * Cookie: X-API-KEY=abcdef12345\n * ```\n */\nmodel ApiKeyAuth<TLocation extends ApiKeyLocation, TName extends string> {\n  type: AuthType.apiKey;\n  in: TLocation;\n  name: TName;\n}\n\n/**\n * OAuth 2.0 is an authorization protocol that gives an API client limited access to user data on a web server.\n * OAuth relies on authentication scenarios called flows, which allow the resource owner (user) to share the protected content from the resource server without sharing their credentials.\n * For that purpose, an OAuth 2.0 server issues access tokens that the client applications can use to access protected resources on behalf of the resource owner.\n * For more information about OAuth 2.0, see oauth.net and RFC 6749.\n */\nmodel OAuth2Auth<TFlows extends OAuth2Flow[]> {\n  type: AuthType.oauth2;\n  flows: TFlows;\n}\n\nenum OAuth2FlowType {\n  authorizationCode,\n  implicit,\n  password,\n  clientCredentials,\n}\n\nalias OAuth2Flow = AuthorizationCodeFlow | ImplicitFlow | PasswordFlow | ClientCredentialsFlow;\n\n/**\n * Authorization Code flow\n */\nmodel AuthorizationCodeFlow {\n  type: OAuth2FlowType.authorizationCode;\n  authorizationUrl: string;\n  tokenUrl: string;\n  refreshUrl?: string;\n  scopes: string[];\n}\n\n/**\n * Implicit flow\n */\nmodel ImplicitFlow {\n  type: OAuth2FlowType.implicit;\n  authorizationUrl: string;\n  refreshUrl?: string;\n  scopes: string[];\n}\n\n/**\n * Resource Owner Password flow\n */\nmodel PasswordFlow {\n  type: OAuth2FlowType.password;\n  authorizationUrl: string;\n  refreshUrl?: string;\n  scopes: string[];\n}\n\n/**\n * Client credentials flow\n */\nmodel ClientCredentialsFlow {\n  type: OAuth2FlowType.clientCredentials;\n  tokenUrl: string;\n  refreshUrl?: string;\n  scopes: string[];\n}\n",
  "lib/resource.cadl": "import \"./http.cadl\";\nimport \"../dist/src/index.js\";\nimport \"../dist/src/internal-decorators.js\";\n\nnamespace Cadl.Rest.Resource;\n\nusing Cadl.Http;\n\n@doc(\"The default error response for resource operations.\")\nmodel ResourceError {\n  @doc(\"The error code.\")\n  code: int32;\n\n  @doc(\"The error message.\")\n  message: string;\n}\n\n@doc(\"Dynamically gathers keys of the model type T.\")\n@copyResourceKeyParameters\nmodel KeysOf<T> {}\n\n@doc(\"Dynamically gathers parent keys of the model type T.\")\n@copyResourceKeyParameters(\"parent\")\nmodel ParentKeysOf<T> {}\n\n@doc(\"Represents operation parameters for resource TResource.\")\nmodel ResourceParameters<TResource> {\n  ...KeysOf<TResource>;\n}\n\n@doc(\"Represents collection operation parameters for resource TResource.\")\nmodel ResourceCollectionParameters<TResource> {\n  ...ParentKeysOf<TResource>;\n}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ResourceRead<TResource, TError> {\n  @autoRoute\n  @doc(\"Gets an instance of the resource.\")\n  @readsResource(TResource)\n  get(...ResourceParameters<TResource>): TResource | TError;\n}\n\n@doc(\"Resource create operation completed successfully.\")\nmodel ResourceCreatedResponse<T> {\n  ...CreatedResponse;\n  @body body: T;\n}\n\ninterface ResourceCreateOrReplace<TResource, TError> {\n  @autoRoute\n  @doc(\"Creates or replaces a instance of the resource.\")\n  @createsOrReplacesResource(TResource)\n  createOrReplace(\n    ...ResourceParameters<TResource>,\n    @body resource: ResourceCreateModel<TResource>\n  ): TResource | ResourceCreatedResponse<TResource> | TError;\n}\n\n@friendlyName(\"{name}Update\", TResource)\nmodel ResourceCreateOrUpdateModel<TResource>\n  is OptionalProperties<UpdateableProperties<DefaultKeyVisibility<TResource, \"read\">>>;\n\ninterface ResourceCreateOrUpdate<TResource, TError> {\n  @autoRoute\n  @doc(\"Creates or update a instance of the resource.\")\n  @createsOrUpdatesResource(TResource)\n  createOrUpdate(\n    ...ResourceParameters<TResource>,\n    @body resource: ResourceCreateOrUpdateModel<TResource>\n  ): TResource | ResourceCreatedResponse<TResource> | TError;\n}\n\n@friendlyName(\"{name}Create\", TResource)\nmodel ResourceCreateModel<TResource>\n  is UpdateableProperties<DefaultKeyVisibility<TResource, \"read\">>;\n\ninterface ResourceCreate<TResource, TError> {\n  @autoRoute\n  @doc(\"Creates a new instance of the resource.\")\n  @createsResource(TResource)\n  create(\n    ...ResourceCollectionParameters<TResource>,\n    @body resource: ResourceCreateModel<TResource>\n  ): TResource | ResourceCreatedResponse<TResource> | TError;\n}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ResourceUpdate<TResource, TError> {\n  @autoRoute\n  @doc(\"Updates an existing instance of the resource.\")\n  @updatesResource(TResource)\n  update(\n    ...ResourceParameters<TResource>,\n    @body properties: ResourceCreateOrUpdateModel<TResource>\n  ): TResource | TError;\n}\n\n@doc(\"Resource deleted successfully.\")\nmodel ResourceDeletedResponse {\n  @doc(\"The status code.\")\n  @statusCode\n  _: 200;\n}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ResourceDelete<TResource, TError> {\n  @autoRoute\n  @doc(\"Deletes an existing instance of the resource.\")\n  @deletesResource(TResource)\n  delete(...ResourceParameters<TResource>): ResourceDeletedResponse | TError;\n}\n\n@doc(\"Paged response of {name} items\", T)\n@friendlyName(\"{name}Page\", T)\nmodel Page<T> {\n  @doc(\"The items on this page\")\n  value: T[];\n\n  @doc(\"The link to the next page of items\")\n  nextLink?: ResourceLocation<T>;\n}\n\ninterface ResourceList<TResource, TError> {\n  @autoRoute\n  @doc(\"Lists all instances of the resource.\")\n  @listsResource(TResource)\n  list(...ResourceCollectionParameters<TResource>): Page<TResource> | TError;\n}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ResourceInstanceOperations<TResource, TError>\n  extends ResourceRead<TResource, TError>,\n    ResourceUpdate<TResource, TError>,\n    ResourceDelete<TResource, TError> {}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ResourceCollectionOperations<TResource, TError>\n  extends ResourceCreate<TResource, TError>,\n    ResourceList<TResource, TError> {}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ResourceOperations<TResource, TError>\n  extends ResourceInstanceOperations<TResource, TError>,\n    ResourceCollectionOperations<TResource, TError> {}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface SingletonResourceRead<TSingleton, TResource, TError> {\n  @autoRoute\n  @doc(\"Gets the singleton resource.\")\n  @segmentOf(TSingleton)\n  @readsResource(TSingleton)\n  Get(...ResourceParameters<TResource>): TSingleton | TError;\n}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface SingletonResourceUpdate<TSingleton, TResource, TError> {\n  @autoRoute\n  @doc(\"Updates the singleton resource.\")\n  @segmentOf(TSingleton)\n  @updatesResource(TSingleton)\n  Update(\n    ...ResourceParameters<TResource>,\n\n    @body\n    properties: ResourceCreateOrUpdateModel<TSingleton>\n  ): TSingleton | TError;\n}\n\ninterface SingletonResourceOperations<TSingleton, TResource, TError>\n  extends SingletonResourceRead<TSingleton, TResource, TError>,\n    SingletonResourceUpdate<TSingleton, TResource, TError> {}\n\n@Private.validateHasKey(TResource)\n@Private.validateIsError(TError)\ninterface ExtensionResourceRead<TExtension, TResource, TError> {\n  @autoRoute\n  @doc(\"Gets an instance of the extension resource.\")\n  @readsResource(TExtension)\n  Get(...ResourceParameters<TResource>, ...ResourceParameters<TExtension>): TExtension | TError;\n}\n\ninterface ExtensionResourceCreateOrUpdate<TExtension, TResource, TError> {\n  @autoRoute\n  @doc(\"Creates or update a instance of the extension resource.\")\n  @createsOrUpdatesResource(TExtension)\n  CreateOrUpdate(\n    ...ResourceParameters<TResource>,\n    ...ResourceParameters<TExtension>,\n    @body resource: ResourceCreateOrUpdateModel<TExtension>\n  ): TExtension | ResourceCreatedResponse<TExtension> | TError;\n}\n\ninterface ExtensionResourceCreate<TExtension, TResource, TError> {\n  @autoRoute\n  @doc(\"Creates a new instance of the extension resource.\")\n  @createsResource(TExtension)\n  Create(\n    ...ResourceParameters<TResource>,\n    @body resource: ResourceCreateModel<TExtension>\n  ): TExtension | ResourceCreatedResponse<TExtension> | TError;\n}\n\ninterface ExtensionResourceUpdate<TExtension, TResource, TError> {\n  @autoRoute\n  @doc(\"Updates an existing instance of the extension resource.\")\n  @updatesResource(TExtension)\n  Update(\n    ...ResourceParameters<TResource>,\n    ...ResourceParameters<TExtension>,\n\n    @body\n    properties: ResourceCreateOrUpdateModel<TExtension>\n  ): TExtension | TError;\n}\n\ninterface ExtensionResourceDelete<TExtension, TResource, TError> {\n  @autoRoute\n  @doc(\"Deletes an existing instance of the extension resource.\")\n  @deletesResource(TExtension)\n  Delete(\n    ...ResourceParameters<TResource>,\n    ...ResourceParameters<TExtension>\n  ): ResourceDeletedResponse | TError;\n}\n\ninterface ExtensionResourceList<TExtension, TResource, TError> {\n  @autoRoute\n  @doc(\"Lists all instances of the extension resource.\")\n  @listsResource(TExtension)\n  List(\n    ...ResourceParameters<TResource>,\n    ...ResourceCollectionParameters<TExtension>\n  ): Page<TExtension> | TError;\n}\n\ninterface ExtensionResourceInstanceOperations<TExtension, TResource, TError>\n  extends ExtensionResourceRead<TExtension, TResource, TError>,\n    ExtensionResourceUpdate<TExtension, TResource, TError>,\n    ExtensionResourceDelete<TExtension, TResource, TError> {}\n\ninterface ExtensionResourceCollectionOperations<TExtension, TResource, TError>\n  extends ExtensionResourceCreate<TExtension, TResource, TError>,\n    ExtensionResourceList<TExtension, TResource, TError> {}\n\ninterface ExtensionResourceOperations<TExtension, TResource, TError>\n  extends ExtensionResourceInstanceOperations<TExtension, TResource, TError>,\n    ExtensionResourceCollectionOperations<TExtension, TResource, TError> {}\n"
};
const _CadlLibrary_ = {
  jsSourceFiles: CadlJSSources,
  cadlSourceFiles: CadlSources,
};

export { _CadlLibrary_, namespace$1 as namespace };
