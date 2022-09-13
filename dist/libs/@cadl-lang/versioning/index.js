import { paramMessage, createCadlLibrary, validateDecoratorParamType, validateDecoratorTarget, navigateProgram, isTemplateInstance, NoTarget } from '@cadl-lang/compiler';

const libDef = {
    name: "@cadl-lang/versioning",
    diagnostics: {
        "versioned-dependency-tuple": {
            severity: "error",
            messages: {
                default: `Versioned dependency mapping must be a tuple [SourceVersion, TargetVersion].`,
            },
        },
        "versioned-dependency-tuple-enum-member": {
            severity: "error",
            messages: {
                default: `Versioned dependency mapping must be between enum members.`,
            },
        },
        "versioned-dependency-same-namespace": {
            severity: "error",
            messages: {
                default: `Versioned dependency mapping must all point to the same namespace but 2 versions have different namespaces '${"namespace1"}' and '${"namespace2"}'.`,
            },
        },
        "versioned-dependency-record-not-mapping": {
            severity: "error",
            messages: {
                default: paramMessage `The versionedDependency decorator must provide a model mapping local versions to dependency '${"dependency"}' versions`,
            },
        },
        "versioned-dependency-not-picked": {
            severity: "error",
            messages: {
                default: paramMessage `The versionedDependency decorator must provide a version of the dependency '${"dependency"}'.`,
            },
        },
        "version-not-found": {
            severity: "error",
            messages: {
                default: paramMessage `The provided version '${"version"}' from '${"enumName"}' is not declared as a version enum. Use '@versioned(${"enumName"})' on the containing namespace.`,
            },
        },
        "using-versioned-library": {
            severity: "error",
            messages: {
                default: paramMessage `Namespace '${"sourceNs"}' is referencing types from versioned namespace '${"targetNs"}' but didn't specify which versions with @versionedDependency.`,
            },
        },
        "incompatible-versioned-reference": {
            severity: "error",
            messages: {
                default: paramMessage `'${"sourceName"}' is referencing versioned type '${"targetName"}' but is not versioned itself.`,
                addedAfter: paramMessage `'${"sourceName"}' was added on version '${"sourceAddedOn"}' but referencing type '${"targetName"}' added in version '${"targetAddedOn"}'.`,
                dependentAddedAfter: paramMessage `'${"sourceName"}' was added on version '${"sourceAddedOn"}' but contains type '${"targetName"}' added in version '${"targetAddedOn"}'.`,
                removedBefore: paramMessage `'${"sourceName"}' was removed on version '${"sourceRemovedOn"}' but referencing type '${"targetName"}' removed in version '${"targetRemovedOn"}'.`,
                dependentRemovedBefore: paramMessage `'${"sourceName"}' was removed on version '${"sourceRemovedOn"}' but contains type '${"targetName"}' removed in version '${"targetRemovedOn"}'.`,
                versionedDependencyAddedAfter: paramMessage `'${"sourceName"}' is referencing type '${"targetName"}' added in version '${"targetAddedOn"}' but version used is ${"dependencyVersion"}.`,
                versionedDependencyRemovedBefore: paramMessage `'${"sourceName"}' is referencing type '${"targetName"}' added in version '${"targetAddedOn"}' but version used is ${"dependencyVersion"}.`,
            },
        },
    },
};
const { reportDiagnostic } = createCadlLibrary(libDef);

const addedOnKey = Symbol("addedOn");
const removedOnKey = Symbol("removedOn");
const versionsKey = Symbol("versions");
const versionDependencyKey = Symbol("versionDependency");
const renamedFromKey = Symbol("renamedFrom");
const madeOptionalKey = Symbol("madeOptional");
const namespace = "Cadl.Versioning";
function checkIsVersion(program, enumMember, diagnosticTarget) {
    const version = getVersionForEnumMember(program, enumMember);
    if (!version) {
        reportDiagnostic(program, {
            code: "version-not-found",
            target: diagnosticTarget,
            format: { version: enumMember.name, enumName: enumMember.enum.name },
        });
    }
    return version;
}
function $added(context, t, v) {
    const { program } = context;
    if (!validateDecoratorParamType(program, t, v, "EnumMember")) {
        return;
    }
    const version = checkIsVersion(context.program, v, context.getArgumentTarget(0));
    if (!version) {
        return;
    }
    program.stateMap(addedOnKey).set(t, version);
}
function $removed(context, t, v) {
    const { program } = context;
    if (!validateDecoratorParamType(program, t, v, "EnumMember")) {
        return;
    }
    const version = checkIsVersion(context.program, v, context.getArgumentTarget(0));
    if (!version) {
        return;
    }
    program.stateMap(removedOnKey).set(t, version);
}
function $renamedFrom(context, t, v, oldName) {
    const { program } = context;
    if (!validateDecoratorParamType(program, t, v, "EnumMember")) {
        return;
    }
    const version = checkIsVersion(context.program, v, context.getArgumentTarget(0));
    if (!version) {
        return;
    }
    const record = { v: version, oldName: oldName };
    program.stateMap(renamedFromKey).set(t, record);
}
function $madeOptional(context, t, v) {
    const { program } = context;
    if (!validateDecoratorParamType(program, t, v, "EnumMember")) {
        return;
    }
    const version = checkIsVersion(context.program, v, context.getArgumentTarget(0));
    if (!version) {
        return;
    }
    program.stateMap(madeOptionalKey).set(t, version);
}
/**
 * @returns version when the given type was added if applicable.
 */
function getRenamedFromVersion(p, t) {
    var _a;
    return (_a = p.stateMap(renamedFromKey).get(t)) === null || _a === void 0 ? void 0 : _a.v;
}
/**
 * @returns get old renamed name if applicable.
 */
function getRenamedFromOldName(p, t) {
    var _a, _b;
    return (_b = (_a = p.stateMap(renamedFromKey).get(t)) === null || _a === void 0 ? void 0 : _a.oldName) !== null && _b !== void 0 ? _b : "";
}
/**
 * @returns version when the given type was added if applicable.
 */
function getAddedOn(p, t) {
    return p.stateMap(addedOnKey).get(t);
}
/**
 * @returns version when the given type was removed if applicable.
 */
function getRemovedOn(p, t) {
    return p.stateMap(removedOnKey).get(t);
}
/**
 * @returns version when the given type was made optional if applicable.
 */
function getMadeOptionalOn(p, t) {
    return p.stateMap(madeOptionalKey).get(t);
}
class VersionMap {
    constructor(namespace, enumType) {
        var _a, _b;
        this.map = new Map();
        for (const [index, member] of enumType.members.entries()) {
            this.map.set(member, {
                name: member.name,
                value: (_b = (_a = member.value) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : member.name,
                enumMember: member,
                index,
                namespace,
            });
        }
    }
    getVersionForEnumMember(member) {
        return this.map.get(member);
    }
    getVersions() {
        return [...this.map.values()];
    }
    get size() {
        return this.map.size;
    }
}
function $versioned(context, t, versions) {
    if (!validateDecoratorTarget(context, t, "@versioned", "Namespace")) {
        return;
    }
    if (!validateDecoratorParamType(context.program, t, versions, "Enum")) {
        return;
    }
    context.program.stateMap(versionsKey).set(t, new VersionMap(t, versions));
}
function getVersion(p, t) {
    return p.stateMap(versionsKey).get(t);
}
function $versionedDependency(context, referenceNamespace, versionRecord) {
    const { program } = context;
    if (!validateDecoratorTarget(context, referenceNamespace, "@versionedDependency", "Namespace") ||
        !validateDecoratorParamType(program, referenceNamespace, versionRecord, ["Tuple", "EnumMember"])) {
        return;
    }
    let state = program.stateMap(versionDependencyKey).get(referenceNamespace);
    if (!state) {
        state = new Map();
        context.program.stateMap(versionDependencyKey).set(referenceNamespace, state);
    }
    if (versionRecord.kind === "EnumMember") {
        const v = checkIsVersion(program, versionRecord, context.getArgumentTarget(0));
        if (v) {
            state.set(v.namespace, v);
        }
    }
    else {
        let targetNamespace;
        const versionMap = new Map();
        for (const entry of versionRecord.values) {
            if (entry.kind !== "Tuple") {
                reportDiagnostic(context.program, { code: "versioned-dependency-tuple", target: entry });
                continue;
            }
            const [sourceMember, targetMember] = entry.values;
            if (sourceMember === undefined || sourceMember.kind !== "EnumMember") {
                reportDiagnostic(context.program, {
                    code: "versioned-dependency-tuple-enum-member",
                    target: sourceMember !== null && sourceMember !== void 0 ? sourceMember : entry,
                });
                continue;
            }
            if (targetMember === undefined || targetMember.kind !== "EnumMember") {
                reportDiagnostic(context.program, {
                    code: "versioned-dependency-tuple-enum-member",
                    target: targetMember !== null && targetMember !== void 0 ? targetMember : entry,
                });
                continue;
            }
            const targetVersion = checkIsVersion(program, targetMember, targetMember);
            if (!targetVersion) {
                continue;
            }
            if (targetNamespace === undefined) {
                targetNamespace = targetVersion.namespace;
            }
            else if (targetNamespace !== targetVersion.namespace) {
                reportDiagnostic(context.program, {
                    code: "versioned-dependency-same-namespace",
                    format: {
                        namespace1: program.checker.getNamespaceString(targetNamespace),
                        namespace2: program.checker.getNamespaceString(targetVersion.namespace),
                    },
                    target: targetMember,
                });
                return;
            }
            versionMap.set(sourceMember, targetVersion);
        }
        if (targetNamespace) {
            state.set(targetNamespace, versionMap);
        }
    }
}
function getVersionDependencies(program, namespace) {
    const data = program.stateMap(versionDependencyKey).get(namespace);
    if (data === undefined) {
        return undefined;
    }
    const result = new Map();
    for (const [key, value] of data) {
        result.set(key, resolveVersionDependency(program, value));
    }
    return result;
}
function resolveVersionDependency(program, data) {
    if (!(data instanceof Map)) {
        return data;
    }
    const mapping = new Map();
    for (const [key, value] of data) {
        const sourceVersion = getVersionForEnumMember(program, key);
        if (sourceVersion !== undefined) {
            mapping.set(sourceVersion, value);
        }
    }
    return mapping;
}
/**
 * Resolve the version to use for all namespace for each of the root namespace versions.
 * @param program
 * @param rootNs Root namespace.
 */
function resolveVersions(program, rootNs) {
    var _a;
    const versions = getVersion(program, rootNs);
    const dependencies = (_a = getVersionDependencies(program, rootNs)) !== null && _a !== void 0 ? _a : new Map();
    if (!versions) {
        if (dependencies.size === 0) {
            return [{ rootVersion: undefined, versions: new Map() }];
        }
        else {
            const map = new Map();
            for (const [dependencyNs, version] of dependencies) {
                if (version instanceof Map) {
                    const rootNsName = program.checker.getNamespaceString(rootNs);
                    const dependencyNsName = program.checker.getNamespaceString(dependencyNs);
                    throw new Error(`Unexpected error: Namespace ${rootNsName} version dependency to ${dependencyNsName} should be a picked version.`);
                }
                map.set(dependencyNs, version);
            }
            return [{ rootVersion: undefined, versions: map }];
        }
    }
    else {
        return versions.getVersions().map((version) => {
            const resolution = {
                rootVersion: version,
                versions: new Map(),
            };
            resolution.versions.set(rootNs, version);
            for (const [dependencyNs, versionMap] of dependencies) {
                if (!(versionMap instanceof Map)) {
                    const rootNsName = program.checker.getNamespaceString(rootNs);
                    const dependencyNsName = program.checker.getNamespaceString(dependencyNs);
                    throw new Error(`Unexpected error: Namespace ${rootNsName} version dependency to ${dependencyNsName} should be a mapping of version.`);
                }
                resolution.versions.set(dependencyNs, versionMap.get(version));
            }
            return resolution;
        });
    }
}
const versionIndex = new Map();
/**
 * @internal
 */
function indexVersions(program, versions) {
    const versionKey = program.checker.createType({
        kind: "Object",
        properties: {},
    });
    versionIndex.set(versionKey, versions);
    return versionKey;
}
function getVersionForNamespace(versionKey, namespaceType) {
    var _a;
    return (_a = versionIndex.get(versionKey)) === null || _a === void 0 ? void 0 : _a.get(namespaceType);
}
function buildVersionProjections(program, rootNs) {
    const resolutions = resolveVersions(program, rootNs);
    versionIndex.clear();
    return resolutions.map((resolution) => {
        var _a;
        if (resolution.versions.size === 0) {
            return { version: undefined, projections: [] };
        }
        else {
            const versionKey = indexVersions(program, resolution.versions);
            return {
                version: (_a = resolution.rootVersion) === null || _a === void 0 ? void 0 : _a.value,
                projections: [
                    {
                        projectionName: "v",
                        arguments: [versionKey],
                    },
                ],
            };
        }
    });
}
const versionCache = new WeakMap();
function cacheVersion(key, versions) {
    versionCache.set(key, versions);
    return versions;
}
function getVersionsForEnum(program, version) {
    const namespace = version.enum.namespace;
    if (namespace === undefined) {
        return [];
    }
    const nsVersion = getVersion(program, namespace);
    if (nsVersion === undefined) {
        return [];
    }
    return [namespace, nsVersion];
}
function getVersions(p, t) {
    if (versionCache.has(t)) {
        return versionCache.get(t);
    }
    if (t.kind === "Namespace") {
        const nsVersion = getVersion(p, t);
        if (nsVersion !== undefined) {
            return cacheVersion(t, [t, nsVersion]);
        }
        else if (t.namespace) {
            return cacheVersion(t, getVersions(p, t.namespace));
        }
        else {
            return cacheVersion(t, [t, undefined]);
        }
    }
    else if (t.kind === "Operation" ||
        t.kind === "Interface" ||
        t.kind === "Model" ||
        t.kind === "Union" ||
        t.kind === "Enum") {
        if (t.namespace) {
            return cacheVersion(t, getVersions(p, t.namespace) || []);
        }
        else if (t.kind === "Operation" && t.interface) {
            return cacheVersion(t, getVersions(p, t.interface) || []);
        }
        else {
            return cacheVersion(t, []);
        }
    }
    else if (t.kind === "ModelProperty") {
        if (t.sourceProperty) {
            return getVersions(p, t.sourceProperty);
        }
        else if (t.model) {
            return getVersions(p, t.model);
        }
        else {
            return cacheVersion(t, []);
        }
    }
    else if (t.kind === "EnumMember") {
        return cacheVersion(t, getVersions(p, t.enum) || []);
    }
    else if (t.kind === "UnionVariant") {
        return cacheVersion(t, getVersions(p, t.union) || []);
    }
    else {
        return cacheVersion(t, []);
    }
}
// these decorators take a `versionSource` parameter because not all types can walk up to
// the containing namespace. Model properties, for example.
function addedAfter(p, type, version) {
    const appliesAt = appliesAtVersion(getAddedOn, p, type, version);
    return appliesAt === null ? false : !appliesAt;
}
function removedOnOrBefore(p, type, version) {
    const appliesAt = appliesAtVersion(getRemovedOn, p, type, version);
    return appliesAt === null ? false : appliesAt;
}
function renamedAfter(p, type, version) {
    const appliesAt = appliesAtVersion(getRenamedFromVersion, p, type, version);
    return appliesAt === null ? false : !appliesAt;
}
function madeOptionalAfter(p, type, version) {
    const appliesAt = appliesAtVersion(getMadeOptionalOn, p, type, version);
    return appliesAt === null ? false : !appliesAt;
}
function getVersionForEnumMember(program, member) {
    const [, versions] = getVersionsForEnum(program, member);
    return versions === null || versions === void 0 ? void 0 : versions.getVersionForEnumMember(member);
}
/**
 * returns either null, which means unversioned, or true or false dependnig
 * on whether the change is active or not at that particular version
 */
function appliesAtVersion(getMetadataFn, p, type, versionKey) {
    var _a;
    const [namespace] = getVersions(p, type);
    if (namespace === undefined) {
        return null;
    }
    const version = getVersionForNamespace(versionKey, (_a = namespace.projectionBase) !== null && _a !== void 0 ? _a : namespace);
    if (version === undefined) {
        return null;
    }
    const appliedOnVersion = getMetadataFn(p, type);
    if (appliedOnVersion === undefined) {
        return null;
    }
    const appliedOnVersionIndex = appliedOnVersion.index;
    if (appliedOnVersionIndex === -1)
        return null;
    const testVersionIndex = version.index;
    if (testVersionIndex === -1)
        return null;
    return testVersionIndex >= appliedOnVersionIndex;
}

var f0 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    namespace: namespace,
    $added: $added,
    $removed: $removed,
    $renamedFrom: $renamedFrom,
    $madeOptional: $madeOptional,
    getRenamedFromVersion: getRenamedFromVersion,
    getRenamedFromOldName: getRenamedFromOldName,
    getAddedOn: getAddedOn,
    getRemovedOn: getRemovedOn,
    getMadeOptionalOn: getMadeOptionalOn,
    VersionMap: VersionMap,
    $versioned: $versioned,
    getVersion: getVersion,
    $versionedDependency: $versionedDependency,
    getVersionDependencies: getVersionDependencies,
    resolveVersions: resolveVersions,
    indexVersions: indexVersions,
    buildVersionProjections: buildVersionProjections,
    getVersionsForEnum: getVersionsForEnum,
    getVersions: getVersions,
    addedAfter: addedAfter,
    removedOnOrBefore: removedOnOrBefore,
    renamedAfter: renamedAfter,
    madeOptionalAfter: madeOptionalAfter,
    getVersionForEnumMember: getVersionForEnumMember
});

function $onValidate(program) {
    const namespaceDependencies = new Map();
    function addDependency(source, target) {
        if (target === undefined || !("namespace" in target) || target.namespace === undefined) {
            return;
        }
        let set = namespaceDependencies.get(source);
        if (set === undefined) {
            set = new Set();
            namespaceDependencies.set(source, set);
        }
        if (target.namespace !== source) {
            set.add(target.namespace);
        }
    }
    navigateProgram(program, {
        model: (model) => {
            // If this is an instantiated type we don't want to keep the mapping.
            if (isTemplateInstance(model)) {
                return;
            }
            addDependency(model.namespace, model.baseModel);
            for (const prop of model.properties.values()) {
                addDependency(model.namespace, prop.type);
                // Validate model -> property have correct versioning
                validateTargetVersionCompatible(program, model, prop, { isTargetADependent: true });
                // Validate model property -> type have correct versioning
                validateReference(program, prop, prop.type);
            }
        },
        union: (union) => {
            if (union.namespace === undefined) {
                return;
            }
            for (const option of union.options.values()) {
                addDependency(union.namespace, option);
            }
        },
        operation: (op) => {
            var _a, _b;
            const namespace = (_a = op.namespace) !== null && _a !== void 0 ? _a : (_b = op.interface) === null || _b === void 0 ? void 0 : _b.namespace;
            addDependency(namespace, op.parameters);
            addDependency(namespace, op.returnType);
            if (op.interface) {
                // Validate model -> property have correct versioning
                validateTargetVersionCompatible(program, op.interface, op, { isTargetADependent: true });
            }
            validateTargetVersionCompatible(program, op, op.returnType);
        },
        namespace: (namespace) => {
            const version = getVersion(program, namespace);
            const dependencies = getVersionDependencies(program, namespace);
            if (dependencies === undefined) {
                return;
            }
            for (const [dependencyNs, value] of dependencies.entries()) {
                if (version) {
                    if (!(value instanceof Map)) {
                        reportDiagnostic(program, {
                            code: "versioned-dependency-record-not-mapping",
                            format: { dependency: program.checker.getNamespaceString(dependencyNs) },
                            target: namespace,
                        });
                    }
                }
                else {
                    if (value instanceof Map) {
                        reportDiagnostic(program, {
                            code: "versioned-dependency-not-picked",
                            format: { dependency: program.checker.getNamespaceString(dependencyNs) },
                            target: namespace,
                        });
                    }
                }
            }
        },
    });
    validateVersionedNamespaceUsage(program, namespaceDependencies);
}
function validateVersionedNamespaceUsage(program, namespaceDependencies) {
    for (const [source, targets] of namespaceDependencies.entries()) {
        const dependencies = source && getVersionDependencies(program, source);
        for (const target of targets) {
            const targetVersions = getVersion(program, target);
            if (targetVersions !== undefined && (dependencies === null || dependencies === void 0 ? void 0 : dependencies.get(target)) === undefined) {
                reportDiagnostic(program, {
                    code: "using-versioned-library",
                    format: {
                        sourceNs: program.checker.getNamespaceString(source),
                        targetNs: program.checker.getNamespaceString(target),
                    },
                    target: source !== null && source !== void 0 ? source : NoTarget,
                });
            }
        }
    }
}
/**
 * Validate the target reference versioning is compatible with the source versioning.
 * This will also validate any template arguments used in the reference.
 * e.g. The target cannot be added after the source was added.
 * @param source Source type referencing the target type.
 * @param target Type being referenced from the source
 */
function validateReference(program, source, target) {
    validateTargetVersionCompatible(program, source, target);
    if (target.kind === "Model" && target.templateArguments) {
        for (const param of target.templateArguments) {
            validateTargetVersionCompatible(program, source, param);
        }
    }
}
/**
 * Validate the target versioning is compatible with the versioning of the soruce.
 * e.g. The target cannot be added after the source was added.
 * @param source Source type referencing the target type.
 * @param target Type being referenced from the source
 */
function validateTargetVersionCompatible(program, source, target, validateOptions = {}) {
    var _a;
    let targetVersionRange = getResolvedVersionRange(program, target);
    if (targetVersionRange === undefined) {
        return;
    }
    const sourceVersionRange = getResolvedVersionRange(program, source);
    const [sourceNamespace, sourceVersions] = getVersions(program, source);
    const [targetNamespace, _targetVersions] = getVersions(program, target);
    if (sourceNamespace === undefined) {
        return;
    }
    if (targetNamespace === undefined) {
        return;
    }
    if (sourceNamespace !== targetNamespace) {
        const versionMap = (_a = getVersionDependencies(program, source.namespace)) === null || _a === void 0 ? void 0 : _a.get(targetNamespace);
        if (versionMap === undefined) {
            return;
        }
        targetVersionRange = translateVersionRange(program, targetVersionRange, versionMap, source, target);
        if (targetVersionRange === undefined) {
            return;
        }
    }
    if (validateOptions.isTargetADependent) {
        validateRangeCompatibleForContains(program, sourceVersionRange, targetVersionRange, source, target);
    }
    else {
        validateRangeCompatibleForRef(program, sourceVersions, sourceVersionRange, targetVersionRange, source, target);
    }
}
function translateVersionRange(program, range, versionMap, source, target) {
    if (!(versionMap instanceof Map)) {
        const rangeIndex = getVersionRangeIndex(range);
        const selectedVersionIndex = versionMap.index;
        if (rangeIndex.added !== undefined && rangeIndex.added > selectedVersionIndex) {
            reportDiagnostic(program, {
                code: "incompatible-versioned-reference",
                messageId: "versionedDependencyAddedAfter",
                format: {
                    sourceName: program.checker.getTypeName(source),
                    targetName: program.checker.getTypeName(target),
                    dependencyVersion: prettyVersion(versionMap),
                    targetAddedOn: prettyVersion(range.added),
                },
                target: source,
            });
        }
        if (rangeIndex.removed !== undefined && rangeIndex.removed < selectedVersionIndex) {
            reportDiagnostic(program, {
                code: "incompatible-versioned-reference",
                messageId: "versionedDependencyRemovedBefore",
                format: {
                    sourceName: program.checker.getTypeName(source),
                    targetName: program.checker.getTypeName(target),
                    dependencyVersion: prettyVersion(versionMap),
                    targetAddedOn: prettyVersion(range.added),
                },
                target: source,
            });
        }
        return undefined;
    }
    else {
        return {
            added: range.added ? findVersionMapping(versionMap, range.added) : undefined,
            removed: range.removed ? findVersionMapping(versionMap, range.removed) : undefined,
        };
    }
}
function findVersionMapping(versionMap, version) {
    var _a;
    return (_a = [...versionMap.entries()].find(([k, v]) => v === version)) === null || _a === void 0 ? void 0 : _a[0];
}
function getVersionRange(program, type) {
    const addedOn = getAddedOn(program, type);
    const removedOn = getRemovedOn(program, type);
    if (addedOn === undefined && removedOn === undefined) {
        return undefined;
    }
    return { added: addedOn, removed: removedOn };
}
/**
 * Resolve the version range when the given type is to be included. This include looking up in the parent interface or model for versioning information.
 * @param program Program
 * @param type Type to resolve the version range from.
 * @returns A version range specifying when this type was added and removed.
 */
function getResolvedVersionRange(program, type) {
    const range = getVersionRange(program, type);
    switch (type.kind) {
        case "Operation":
            return mergeRanges(range, type.interface ? getResolvedVersionRange(program, type.interface) : undefined);
        case "ModelProperty":
            return mergeRanges(range, type.model ? getResolvedVersionRange(program, type.model) : undefined);
        default:
            return range;
    }
}
function mergeRanges(base, parent) {
    var _a, _b;
    if (parent === undefined) {
        return base;
    }
    if (base === undefined) {
        return parent;
    }
    return {
        added: (_a = base.added) !== null && _a !== void 0 ? _a : parent.added,
        removed: (_b = base.removed) !== null && _b !== void 0 ? _b : parent.removed,
    };
}
function getVersionRangeIndex(range) {
    const added = range.added ? range.added.index : -1;
    const removed = range.removed ? range.removed.index : -1;
    return {
        added: added !== -1 ? added : undefined,
        removed: removed !== -1 ? removed : undefined,
    };
}
function validateRangeCompatibleForRef(program, versions, sourceRange, targetRange, source, target) {
    const targetRangeIndex = getVersionRangeIndex(targetRange);
    if (sourceRange === undefined) {
        if ((targetRangeIndex.added && targetRangeIndex.added > 0) ||
            (targetRangeIndex.removed && targetRangeIndex.removed < versions.size)) {
            reportDiagnostic(program, {
                code: "incompatible-versioned-reference",
                messageId: "default",
                format: {
                    sourceName: program.checker.getTypeName(source),
                    targetName: program.checker.getTypeName(target),
                },
                target: source,
            });
        }
        return;
    }
    const sourceRangeIndex = getVersionRangeIndex(sourceRange);
    if (targetRangeIndex.added !== undefined &&
        (sourceRangeIndex.added === undefined || targetRangeIndex.added > sourceRangeIndex.added)) {
        reportDiagnostic(program, {
            code: "incompatible-versioned-reference",
            messageId: "addedAfter",
            format: {
                sourceName: program.checker.getTypeName(source),
                targetName: program.checker.getTypeName(target),
                sourceAddedOn: prettyVersion(sourceRange.added),
                targetAddedOn: prettyVersion(targetRange.added),
            },
            target: source,
        });
    }
    if (targetRangeIndex.removed !== undefined &&
        (sourceRangeIndex.removed === undefined || targetRangeIndex.removed < sourceRangeIndex.removed)) {
        reportDiagnostic(program, {
            code: "incompatible-versioned-reference",
            messageId: "removedBefore",
            format: {
                sourceName: program.checker.getTypeName(source),
                targetName: program.checker.getTypeName(target),
                sourceRemovedOn: prettyVersion(sourceRange.removed),
                targetRemovedOn: prettyVersion(targetRange.removed),
            },
            target: source,
        });
    }
}
function validateRangeCompatibleForContains(program, sourceRange, targetRange, source, target) {
    if (sourceRange === undefined) {
        return;
    }
    const sourceRangeIndex = getVersionRangeIndex(sourceRange);
    const targetRangeIndex = getVersionRangeIndex(targetRange);
    if (targetRangeIndex.added !== undefined &&
        (sourceRangeIndex.added === undefined || targetRangeIndex.added < sourceRangeIndex.added)) {
        reportDiagnostic(program, {
            code: "incompatible-versioned-reference",
            messageId: "dependentAddedAfter",
            format: {
                sourceName: program.checker.getTypeName(source),
                targetName: program.checker.getTypeName(target),
                sourceAddedOn: prettyVersion(sourceRange.added),
                targetAddedOn: prettyVersion(targetRange.added),
            },
            target: target,
        });
    }
    if (targetRangeIndex.removed !== undefined &&
        (sourceRangeIndex.removed === undefined || targetRangeIndex.removed > sourceRangeIndex.removed)) {
        reportDiagnostic(program, {
            code: "incompatible-versioned-reference",
            messageId: "dependentRemovedBefore",
            format: {
                sourceName: program.checker.getTypeName(source),
                targetName: program.checker.getTypeName(target),
                sourceRemovedOn: prettyVersion(sourceRange.removed),
                targetRemovedOn: prettyVersion(targetRange.removed),
            },
            target: target,
        });
    }
}
function prettyVersion(version) {
    var _a;
    return (_a = version === null || version === void 0 ? void 0 : version.value) !== null && _a !== void 0 ? _a : "<n/a>";
}

var f1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    $onValidate: $onValidate
});

const CadlJSSources = {
"dist/src/versioning.js": f0,
"dist/src/validate.js": f1,
};
const CadlSources = {
  "package.json": "{\"name\":\"@cadl-lang/versioning\",\"version\":\"0.7.0\",\"author\":\"Microsoft Corporation\",\"description\":\"Cadl library for declaring and emitting versioned APIs\",\"homepage\":\"https://github.com/Microsoft/cadl\",\"readme\":\"https://github.com/Microsoft/cadl/blob/master/README.md\",\"license\":\"MIT\",\"repository\":{\"type\":\"git\",\"url\":\"git+https://github.com/Microsoft/cadl.git\"},\"bugs\":{\"url\":\"https://github.com/Microsoft/cadl/issues\"},\"keywords\":[\"cadl\"],\"type\":\"module\",\"main\":\"dist/src/index.js\",\"cadlMain\":\"lib/versioning.cadl\",\"exports\":{\".\":\"./dist/src/index.js\",\"./testing\":\"./dist/src/testing/index.js\"},\"typesVersions\":{\"*\":{\"*\":[\"./dist/src/index.d.ts\"],\"testing\":[\"./dist/src/testing/index.d.ts\"]}},\"engines\":{\"node\":\">=16.0.0\"},\"files\":[\"lib/*.cadl\",\"dist/**\",\"!dist/test/**\"],\"dependencies\":{\"@cadl-lang/compiler\":\"~0.34.0\"},\"devDependencies\":{\"@types/mocha\":\"~9.1.0\",\"@types/node\":\"~16.0.3\",\"@cadl-lang/eslint-config-cadl\":\"~0.4.0\",\"@cadl-lang/library-linter\":\"~0.1.3\",\"@cadl-lang/eslint-plugin\":\"~0.1.1\",\"eslint\":\"^8.12.0\",\"mocha\":\"~9.2.0\",\"mocha-junit-reporter\":\"~2.0.2\",\"mocha-multi-reporters\":\"~1.5.1\",\"c8\":\"~7.11.0\",\"rimraf\":\"~3.0.2\",\"typescript\":\"~4.7.2\"},\"scripts\":{\"clean\":\"rimraf ./dist ./temp\",\"build\":\"tsc -p . && npm run lint-cadl-library\",\"watch\":\"tsc -p . --watch\",\"lint-cadl-library\":\"cadl compile . --warn-as-error --import @cadl-lang/library-linter --no-emit\",\"test\":\"mocha\",\"test-official\":\"c8 mocha --forbid-only --reporter mocha-multi-reporters\",\"lint\":\"eslint . --ext .ts --max-warnings=0\",\"lint:fix\":\"eslint . --fix --ext .ts\"}}",
  "../../../../cadl-azure/core/packages/compiler/lib/main.cadl": "import \"../dist/lib/decorators.js\";\nimport \"./lib.cadl\";\nimport \"./projected-names.cadl\";\n",
  "../../../../cadl-azure/core/packages/compiler/lib/lib.cadl": "namespace Cadl;\n\nmodel object {}\n\n@indexer(integer, T)\nmodel Array<T> {}\n\n@indexer(string, T)\nmodel Record<T> {}\n\n@intrinsic(\"bytes\")\nmodel bytes {}\n\n@numeric\n@intrinsic(\"numeric\")\nmodel numeric {}\n\n@numeric\n@intrinsic(\"integer\")\nmodel integer {}\n\n@numeric\n@intrinsic(\"float\")\nmodel float {}\n\n@numeric\n@intrinsic(\"int64\")\nmodel int64 {}\n\n@numeric\n@intrinsic(\"int32\")\nmodel int32 {}\n\n@numeric\n@intrinsic(\"int16\")\nmodel int16 {}\n\n@numeric\n@intrinsic(\"int8\")\nmodel int8 {}\n\n@numeric\n@intrinsic(\"uint64\")\nmodel uint64 {}\n\n@numeric\n@intrinsic(\"uint32\")\nmodel uint32 {}\n\n@numeric\n@intrinsic(\"uint16\")\nmodel uint16 {}\n\n@numeric\n@intrinsic(\"uint8\")\nmodel uint8 {}\n\n@numeric\n@intrinsic(\"safeint\")\nmodel safeint {}\n\n@numeric\n@intrinsic(\"float32\")\nmodel float32 {}\n\n@numeric\n@intrinsic(\"float64\")\nmodel float64 {}\n\n@intrinsic(\"string\")\nmodel string {}\n\n@intrinsic(\"plainDate\")\nmodel plainDate {}\n\n@intrinsic(\"plainTime\")\nmodel plainTime {}\n\n@intrinsic(\"zonedDateTime\")\nmodel zonedDateTime {}\n\n@intrinsic(\"duration\")\nmodel duration {}\n\n@intrinsic(\"boolean\")\nmodel boolean {}\n\n@intrinsic(\"null\")\nmodel null {}\n\n@deprecated(\"Map is deprecated, use Record<T> instead\")\nmodel Map<K, V> is Record<V>;\n\n@doc(\"The template for adding optional properties.\")\n@withOptionalProperties\nmodel OptionalProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for adding updateable properties.\")\n@withUpdateableProperties\nmodel UpdateableProperties<T> {\n  ...T;\n}\n\n@doc(\"The template for omitting properties.\")\n@withoutOmittedProperties(TStringOrTuple)\nmodel OmitProperties<T, TStringOrTuple> {\n  ...T;\n}\n\n@withoutDefaultValues\nmodel OmitDefaults<T> {\n  ...T;\n}\n\n@doc(\"The template for setting the default visibility of key properties.\")\n@withDefaultKeyVisibility(Visibility)\nmodel DefaultKeyVisibility<T, Visibility> {\n  ...T;\n}\n",
  "../../../../cadl-azure/core/packages/compiler/lib/projected-names.cadl": "// Set of projections consuming the @projectedName decorator\n\n#suppress \"projections-are-experimental\"\nprojection op#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::properties::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameProperty(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n\n    self::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(p::name, getProjectedName(p, targetName));\n      };\n    });\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n\n    self::projectionBase::members::forEach((p) => {\n      if hasProjectedName(p, targetName) {\n        self::renameMember(getProjectedName(p, targetName), p::name);\n      };\n    });\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#target {\n  to(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(getProjectedName(self, targetName));\n    };\n  }\n  from(targetName) {\n    if hasProjectedName(self, targetName) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n",
  "lib/versioning.cadl": "import \"../dist/src/versioning.js\";\nimport \"../dist/src/validate.js\";\n\nusing Cadl.Versioning;\n\n#suppress \"projections-are-experimental\"\nprojection op#v {\n  to(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if removedOnOrBefore(self, version) {\n      return never;\n    } else if renamedAfter(self, version) {\n      self::rename(getRenamedFromOldName(self));\n    };\n  }\n  from(version) {\n    \n    if addedAfter(self, version) {\n      return never;\n    } else if removedOnOrBefore(self, version) {\n      return never;\n    } else if renamedAfter(self, version) {\n      self::rename(self::projectionBase::name);\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection interface#v {\n  to(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if removedOnOrBefore(self, version) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(getRenamedFromOldName(self));\n      };\n\n      self::operations::forEach((operation) => {\n        if addedAfter(operation, version) {\n          self::deleteOperation(operation::name);\n        } else if removedOnOrBefore(operation, version) {\n          self::deleteOperation(operation::name);\n        };\n      });\n    };\n  }\n  from(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(self::projectionBase::name);\n      };\n      \n      self::projectionBase::operations::forEach((operation) => {\n        if addedAfter(operation, version) {\n          self::addOperation(operation::name, operation::parameters, operation::returnType);\n        } else if removedOnOrBefore(operation, version) {\n          self::addOperation(operation::name, operation::parameters, operation::returnType);\n        };\n      });\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection union#v {\n  to(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(getRenamedFromOldName(self));\n      };\n      \n      self::variants::forEach((variant) => {\n        if addedAfter(variant, version) {\n          self::deleteVariant(variant::name);\n        } else if removedOnOrBefore(variant, version) {\n          self::deleteVariant(variant::name);\n        } else if renamedAfter(variant, version) {\n          self::renameVariant(variant::name, getRenamedFromOldName(variant));\n        };\n      });\n    };\n  }\n  from(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(self::projectionBase::name);\n      };\n      \n      self::projectionBase::variants::forEach((variant) => {\n        if addedAfter(variant, version) {\n          self::addVariant(variant::name, variant::type);\n        } else if removedOnOrBefore(variant, version) {\n          self::addVariant(variant::name, variant::type);\n        } else if renamedAfter(variant, version) {\n          self::renameVariant(getRenamedFromOldName(variant), variant::name);\n        };\n      });\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection model#v {\n  to(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(getRenamedFromOldName(self));\n      };\n\n      self::properties::forEach((p) => {\n        if addedAfter(p, version) {\n          self::deleteProperty(p::name);\n        };\n        \n        if removedOnOrBefore(p, version) {\n          self::deleteProperty(p::name);\n        };\n        \n        if renamedAfter(p, version) {\n          self::renameProperty(p::name, getRenamedFromOldName(p));\n        };\n\n        if madeOptionalAfter(p, version) {\n          p::setOptional(false);\n        };\n      });\n    };\n  }\n  from(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(self::projectionBase::name);\n      };\n      \n      self::projectionBase::properties::forEach((p) => {\n        if addedAfter(p, version) {\n          self::addProperty(p::name, p::type);\n        };\n        \n        if removedOnOrBefore(p, version) {\n          self::addProperty(p::name, p::type);\n        };\n\n        if renamedAfter(p, version) {\n          self::renameProperty(getRenamedFromOldName(p), p::name);\n        };\n\n        if madeOptionalAfter(p, version) {\n          p::setOptional(true);\n        };\n      });\n    };\n  }\n}\n\n#suppress \"projections-are-experimental\"\nprojection enum#v {\n  to(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(getRenamedFromOldName(self));\n      };\n      \n      self::members::forEach((m) => {\n        if addedAfter(m, version) {\n          self::deleteMember(m::name);\n        };\n        \n        if removedOnOrBefore(m, version) {\n          self::deleteMember(m::name);\n        };\n        \n        if renamedAfter(m, version) {\n          self::renameMember(m::name, getRenamedFromOldName(m));\n        };\n      });\n    };\n  }\n  from(version) {\n    if addedAfter(self, version) {\n      return never;\n    } else if (removedOnOrBefore(self, version)) {\n      return never;\n    } else {\n      if renamedAfter(self, version) {\n        self::rename(self::projectionBase::name);\n      };\n      \n      self::projectionBase::members::forEach((m) => {\n        if addedAfter(m, version, self::projectionBase) {\n          self::addMember(m::name, m::type);\n        };\n        \n        if removedOnOrBefore(m, version, self::projectionBase) {\n          self::addMember(m::name, m::type);\n        };\n\n        if renamedAfter(m, version, self::projectionBase) {\n          self::renameMember(getRenamedFromOldName(m), m::name);\n        };\n      });\n    };\n  }\n}\n"
};
const _CadlLibrary_ = {
  jsSourceFiles: CadlJSSources,
  cadlSourceFiles: CadlSources,
};

export { $added, $madeOptional, $onValidate, $removed, $renamedFrom, $versioned, $versionedDependency, VersionMap, _CadlLibrary_, addedAfter, buildVersionProjections, getAddedOn, getMadeOptionalOn, getRemovedOn, getRenamedFromOldName, getRenamedFromVersion, getVersion, getVersionDependencies, getVersionForEnumMember, getVersions, getVersionsForEnum, indexVersions, madeOptionalAfter, namespace, removedOnOrBefore, renamedAfter, resolveVersions };
