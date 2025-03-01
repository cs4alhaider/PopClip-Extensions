#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// convert "old style" JSON config to "new style"
/* eslint-disable @typescript-eslint/no-dynamic-delete */
const ca = __importStar(require("case-anything"));
const mapping_json_1 = require("./mapping.json");
// read all of stdin
const chunks = [];
process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
        chunks.push(chunk);
    }
});
process.stdin.on('end', () => {
    process.stdout.write(convert(chunks.join('')));
});
/**
 * Rename a single property name.
 * @param name Property name to rename
 * @returns The renamed property name
 */
function rename(name) {
    name = ca.lowerCase(name);
    // remove defined prefixes
    for (const prefix of mapping_json_1.prefixes) {
        if (typeof prefix === 'string' && name.startsWith(prefix)) {
            name = name.substring(prefix.length, name.length);
        }
    }
    // perform defined renamings
    if (Object.keys(mapping_json_1.mapping).includes(name)) {
        name = mapping_json_1.mapping[name];
    }
    return ca.camelCase(name);
}
/**
 * Rename an object's enumerable string keys using a given transform.
 * @param obj Object whose keys should be renamed
 * @param transform The renaming transform
 * @returns New object with renamed keys.
 */
function renameKeys(obj, transform) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = transform(key);
        if (Array.isArray(value)) {
            const arr = [];
            for (const member of value) {
                if (member !== null && typeof member === 'object' && !Array.isArray(member)) {
                    arr.push(renameKeys(member, transform));
                }
                else {
                    arr.push(member); // don't process arrays within arrays
                }
            }
            result[newKey] = arr;
        }
        else if (value !== null && typeof value === 'object') {
            result[newKey] = renameKeys(value, transform);
        }
        else {
            result[newKey] = value;
        }
    }
    return result;
}
// remove localized strings with only en value
function replaceLocalizable(key, value) {
    if (typeof value === 'object' && value !== null) {
        if ('en' in value && Object.keys(value).length === 1) { // of only en key
            value = value.en;
        }
    }
    return value;
}
// remove null entries
function removeNull(key, value) {
    return value === null ? undefined : value;
}
function processSpecial(obj) {
    if ('actions' in obj && Array.isArray(obj.actions) && obj.actions.length === 1) {
        const action = obj.actions[0];
        for (const key of mapping_json_1.actionKeys) {
            if (key in action && !(key in obj)) {
                obj[key] = action[key];
                delete action[key];
            }
        }
        if ('title' in action) {
            if (action.title !== obj.name) {
                obj.title = action.title;
            }
            delete action.title;
        }
        if (Object.keys(action).length === 0) {
            delete obj.actions;
        }
    }
    if ('apps' in obj && Array.isArray(obj.apps) && obj.apps.length === 1) {
        obj.app = obj.apps[0];
        delete obj.apps;
        if (typeof obj.app['bundle identifier'] === 'string') {
            obj.app['bundle identifiers'] = [obj.app['bundle identifier']];
            delete obj.app['bundle identifier'];
        }
    }
    return obj;
}
function convert(jsonConfig) {
    let config = JSON.parse(jsonConfig);
    config = JSON.parse(JSON.stringify(config, replaceLocalizable));
    config = renameKeys(config, rename);
    config = processSpecial(config);
    const keyOrder = mapping_json_1.otherKeysBefore.concat(mapping_json_1.actionKeys, mapping_json_1.otherKeysAfter);
    const ordered = {};
    for (const key of keyOrder) {
        ordered[key] = null;
    }
    Object.assign(ordered, config);
    return JSON.stringify(ordered, removeNull, 2) + '\n';
}
