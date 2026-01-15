/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EDataType } from '../EDataType';

/**
 * Converter interface for DataType serialization/deserialization
 */
export interface DataTypeConverter<T = any> {
  /**
   * Convert a string literal to a TypeScript value
   */
  fromString(literal: string): T;

  /**
   * Convert a TypeScript value to a string literal
   */
  toString(value: T): string;
}

/**
 * Registry for DataType converters
 */
class DataTypeRegistryImpl {
  /**
   * Converters by instanceClassName (e.g., "java.util.Date")
   */
  private convertersByClassName = new Map<string, DataTypeConverter>();

  /**
   * Converters by DataType name (e.g., "EDate", "EBigDecimal")
   */
  private convertersByName = new Map<string, DataTypeConverter>();

  constructor() {
    this.registerDefaultConverters();
  }

  /**
   * Register default converters for standard EMF types
   */
  private registerDefaultConverters(): void {
    // Boolean types
    const booleanConverter: DataTypeConverter<boolean> = {
      fromString: (s) => s.toLowerCase() === 'true',
      toString: (v) => String(v)
    };
    this.registerByClassName('boolean', booleanConverter);
    this.registerByClassName('java.lang.Boolean', booleanConverter);
    this.registerByName('EBoolean', booleanConverter);
    this.registerByName('EBooleanObject', booleanConverter);

    // Integer types
    const intConverter: DataTypeConverter<number> = {
      fromString: (s) => parseInt(s, 10),
      toString: (v) => String(v)
    };
    this.registerByClassName('int', intConverter);
    this.registerByClassName('java.lang.Integer', intConverter);
    this.registerByClassName('short', intConverter);
    this.registerByClassName('java.lang.Short', intConverter);
    this.registerByClassName('byte', intConverter);
    this.registerByClassName('java.lang.Byte', intConverter);
    this.registerByName('EInt', intConverter);
    this.registerByName('EIntegerObject', intConverter);
    this.registerByName('EShort', intConverter);
    this.registerByName('EShortObject', intConverter);
    this.registerByName('EByte', intConverter);
    this.registerByName('EByteObject', intConverter);

    // Long types (BigInt in TypeScript)
    const longConverter: DataTypeConverter<bigint | number> = {
      fromString: (s) => {
        const n = parseInt(s, 10);
        // Use BigInt for very large numbers
        if (Math.abs(n) > Number.MAX_SAFE_INTEGER) {
          return BigInt(s);
        }
        return n;
      },
      toString: (v) => String(v)
    };
    this.registerByClassName('long', longConverter);
    this.registerByClassName('java.lang.Long', longConverter);
    this.registerByName('ELong', longConverter);
    this.registerByName('ELongObject', longConverter);

    // Float/Double types
    const floatConverter: DataTypeConverter<number> = {
      fromString: (s) => parseFloat(s),
      toString: (v) => String(v)
    };
    this.registerByClassName('float', floatConverter);
    this.registerByClassName('java.lang.Float', floatConverter);
    this.registerByClassName('double', floatConverter);
    this.registerByClassName('java.lang.Double', floatConverter);
    this.registerByName('EFloat', floatConverter);
    this.registerByName('EFloatObject', floatConverter);
    this.registerByName('EDouble', floatConverter);
    this.registerByName('EDoubleObject', floatConverter);

    // String types
    const stringConverter: DataTypeConverter<string> = {
      fromString: (s) => s,
      toString: (v) => v ?? ''
    };
    this.registerByClassName('java.lang.String', stringConverter);
    this.registerByClassName('java.lang.Object', stringConverter);
    this.registerByName('EString', stringConverter);

    // Char types
    const charConverter: DataTypeConverter<string> = {
      fromString: (s) => s.charAt(0) || '',
      toString: (v) => v ?? ''
    };
    this.registerByClassName('char', charConverter);
    this.registerByClassName('java.lang.Character', charConverter);
    this.registerByName('EChar', charConverter);
    this.registerByName('ECharacterObject', charConverter);

    // Date types
    const dateConverter: DataTypeConverter<Date> = {
      fromString: (s) => new Date(s),
      toString: (v) => v?.toISOString() ?? ''
    };
    this.registerByClassName('java.util.Date', dateConverter);
    this.registerByName('EDate', dateConverter);

    // BigDecimal / BigInteger (using string representation for precision)
    const bigDecimalConverter: DataTypeConverter<string> = {
      fromString: (s) => s, // Keep as string to preserve precision
      toString: (v) => v ?? '0'
    };
    this.registerByClassName('java.math.BigDecimal', bigDecimalConverter);
    this.registerByClassName('java.math.BigInteger', bigDecimalConverter);
    this.registerByName('EBigDecimal', bigDecimalConverter);
    this.registerByName('EBigInteger', bigDecimalConverter);

    // Byte array types
    const byteArrayConverter: DataTypeConverter<Uint8Array> = {
      fromString: (s) => {
        // Assume base64 encoding
        if (typeof atob === 'function') {
          const binary = atob(s);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        }
        // Node.js fallback
        return new Uint8Array(Buffer.from(s, 'base64'));
      },
      toString: (v) => {
        if (typeof btoa === 'function') {
          return btoa(String.fromCharCode(...v));
        }
        // Node.js fallback
        return Buffer.from(v).toString('base64');
      }
    };
    this.registerByClassName('byte[]', byteArrayConverter);
    this.registerByName('EByteArray', byteArrayConverter);

    // Feature map entry (placeholder - typically handled specially)
    const featureMapConverter: DataTypeConverter<any> = {
      fromString: (s) => s,
      toString: (v) => String(v ?? '')
    };
    this.registerByName('EFeatureMapEntry', featureMapConverter);
  }

  /**
   * Register a converter by instanceClassName
   */
  registerByClassName(className: string, converter: DataTypeConverter): void {
    this.convertersByClassName.set(className, converter);
  }

  /**
   * Register a converter by DataType name
   */
  registerByName(name: string, converter: DataTypeConverter): void {
    this.convertersByName.set(name, converter);
  }

  /**
   * Get converter for a DataType
   */
  getConverter(dataType: EDataType): DataTypeConverter | null {
    // First try by instanceClassName
    const className = dataType.getInstanceClassName();
    if (className) {
      const converter = this.convertersByClassName.get(className);
      if (converter) {
        return converter;
      }
    }

    // Then try by name
    const name = dataType.getName();
    if (name) {
      const converter = this.convertersByName.get(name);
      if (converter) {
        return converter;
      }
    }

    return null;
  }

  /**
   * Convert a string literal to a value using the DataType's converter
   */
  createFromString(dataType: EDataType, literal: string): any {
    const converter = this.getConverter(dataType);
    if (converter) {
      return converter.fromString(literal);
    }
    // Default: return as string
    return literal;
  }

  /**
   * Convert a value to a string literal using the DataType's converter
   */
  convertToString(dataType: EDataType, value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const converter = this.getConverter(dataType);
    if (converter) {
      return converter.toString(value);
    }
    // Default: use String()
    return String(value);
  }

  /**
   * Check if a converter is registered for a DataType
   */
  hasConverter(dataType: EDataType): boolean {
    return this.getConverter(dataType) !== null;
  }

  /**
   * Get all registered classNames
   */
  getRegisteredClassNames(): string[] {
    return Array.from(this.convertersByClassName.keys());
  }

  /**
   * Get all registered names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.convertersByName.keys());
  }
}

/**
 * Global DataType registry instance
 */
export const dataTypeRegistry = new DataTypeRegistryImpl();
