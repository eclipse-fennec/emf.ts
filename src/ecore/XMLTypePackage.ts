/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EPackage, EPackageRegistry } from '../EPackage.js';
import { EDataType } from '../EDataType.js';
import { EClass } from '../EClass.js';
import { EObject } from '../EObject.js';
import { BasicEPackage } from '../runtime/BasicEPackage.js';
import { BasicEDataType } from '../runtime/BasicEDataType.js';
import { BasicEFactory } from '../runtime/BasicEFactory.js';
import { dataTypeRegistry } from '../runtime/DataTypeRegistry.js';
import { XML_TYPE_NS_URI } from './EcorePackage.js';

export const XML_TYPE_NS_PREFIX = 'ecore.xml.type';

/**
 * Singleton instance
 */
let xmlTypePackageInstance: XMLTypePackageImpl | null = null;

/**
 * Get the XMLType package singleton.
 * Auto-registers in EPackageRegistry.INSTANCE on first access.
 */
export function getXMLTypePackage(): XMLTypePackageImpl {
  if (!xmlTypePackageInstance) {
    xmlTypePackageInstance = new XMLTypePackageImpl();
    xmlTypePackageInstance.initialize();
    EPackageRegistry.INSTANCE.set(XML_TYPE_NS_URI, xmlTypePackageInstance);
  }
  return xmlTypePackageInstance;
}

/**
 * Data type definition: [name, instanceClassName]
 */
type DataTypeDef = [string, string];

/**
 * All XML Schema primitive types defined by the XMLType package.
 * Names match those in org.eclipse.emf.ecore.xml.type.XMLTypePackage.
 */
const DATA_TYPE_DEFS: DataTypeDef[] = [
  // Commonly used
  ['AnySimpleType', 'java.lang.Object'],
  ['AnyURI', 'java.lang.String'],
  ['Base64Binary', 'byte[]'],
  ['Boolean', 'boolean'],
  ['BooleanObject', 'java.lang.Boolean'],
  ['Byte', 'byte'],
  ['ByteObject', 'java.lang.Byte'],
  ['Date', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['DateTime', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['Decimal', 'java.math.BigDecimal'],
  ['Double', 'double'],
  ['DoubleObject', 'java.lang.Double'],
  ['Duration', 'javax.xml.datatype.Duration'],
  ['ENTITIES', 'java.util.List'],
  ['ENTITIESBase', 'java.util.List'],
  ['ENTITY', 'java.lang.String'],
  ['Float', 'float'],
  ['FloatObject', 'java.lang.Float'],
  ['GDay', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['GMonth', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['GMonthDay', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['GYear', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['GYearMonth', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['HexBinary', 'byte[]'],
  ['ID', 'java.lang.String'],
  ['IDREF', 'java.lang.String'],
  ['IDREFS', 'java.util.List'],
  ['IDREFSBase', 'java.util.List'],
  ['Int', 'int'],
  ['Integer', 'java.math.BigInteger'],
  ['IntObject', 'java.lang.Integer'],
  ['Language', 'java.lang.String'],
  ['Long', 'long'],
  ['LongObject', 'java.lang.Long'],
  ['Name', 'java.lang.String'],
  ['NCName', 'java.lang.String'],
  ['NegativeInteger', 'java.math.BigInteger'],
  ['NMTOKEN', 'java.lang.String'],
  ['NMTOKENS', 'java.util.List'],
  ['NMTOKENSBase', 'java.util.List'],
  ['NonNegativeInteger', 'java.math.BigInteger'],
  ['NonPositiveInteger', 'java.math.BigInteger'],
  ['NormalizedString', 'java.lang.String'],
  ['NOTATION', 'javax.xml.namespace.QName'],
  ['PositiveInteger', 'java.math.BigInteger'],
  ['QName', 'javax.xml.namespace.QName'],
  ['Short', 'short'],
  ['ShortObject', 'java.lang.Short'],
  ['String', 'java.lang.String'],
  ['Time', 'javax.xml.datatype.XMLGregorianCalendar'],
  ['Token', 'java.lang.String'],
  ['UnsignedByte', 'short'],
  ['UnsignedByteObject', 'java.lang.Short'],
  ['UnsignedInt', 'long'],
  ['UnsignedIntObject', 'java.lang.Long'],
  ['UnsignedLong', 'java.math.BigInteger'],
  ['UnsignedShort', 'int'],
  ['UnsignedShortObject', 'java.lang.Integer'],
];

/**
 * XMLType package implementation.
 * Provides EDataType entries for all XML Schema primitive types.
 */
export class XMLTypePackageImpl extends BasicEPackage {
  private _dataTypes = new Map<string, BasicEDataType>();
  private _initialized = false;

  constructor() {
    super();
    this.setName('type');
    this.setNsURI(XML_TYPE_NS_URI);
    this.setNsPrefix(XML_TYPE_NS_PREFIX);
  }

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;

    for (const [name, instanceClassName] of DATA_TYPE_DEFS) {
      const dt = new BasicEDataType();
      dt.setName(name);
      dt.setInstanceClassName(instanceClassName);
      this.getEClassifiers().push(dt);
      this._dataTypes.set(name, dt);
    }

    // Set ePackage on all classifiers
    for (const classifier of this.getEClassifiers()) {
      if ('setEPackage' in classifier) {
        (classifier as any).setEPackage(this);
      }
    }

    // Set up factory
    const factory = new XMLTypeFactory(this);
    this.setEFactoryInstance(factory);

    // Register converters in the DataTypeRegistry
    this.registerConverters();
  }

  private registerConverters(): void {
    // Boolean
    const boolConv = { fromString: (s: string) => s.toLowerCase() === 'true' || s === '1', toString: (v: boolean) => String(v) };
    dataTypeRegistry.registerByName('Boolean', boolConv);
    dataTypeRegistry.registerByName('BooleanObject', boolConv);

    // Integer types
    const intConv = { fromString: (s: string) => parseInt(s, 10), toString: (v: number) => String(v) };
    dataTypeRegistry.registerByName('Int', intConv);
    dataTypeRegistry.registerByName('IntObject', intConv);
    dataTypeRegistry.registerByName('Short', intConv);
    dataTypeRegistry.registerByName('ShortObject', intConv);
    dataTypeRegistry.registerByName('Byte', intConv);
    dataTypeRegistry.registerByName('ByteObject', intConv);
    dataTypeRegistry.registerByName('UnsignedByte', intConv);
    dataTypeRegistry.registerByName('UnsignedByteObject', intConv);
    dataTypeRegistry.registerByName('UnsignedShort', intConv);
    dataTypeRegistry.registerByName('UnsignedShortObject', intConv);
    dataTypeRegistry.registerByName('UnsignedInt', intConv);
    dataTypeRegistry.registerByName('UnsignedIntObject', intConv);

    // Long types
    const longConv = {
      fromString: (s: string) => { const n = parseInt(s, 10); return Math.abs(n) > Number.MAX_SAFE_INTEGER ? BigInt(s) : n; },
      toString: (v: bigint | number) => String(v)
    };
    dataTypeRegistry.registerByName('Long', longConv);
    dataTypeRegistry.registerByName('LongObject', longConv);

    // Float/Double
    const floatConv = { fromString: (s: string) => parseFloat(s), toString: (v: number) => String(v) };
    dataTypeRegistry.registerByName('Float', floatConv);
    dataTypeRegistry.registerByName('FloatObject', floatConv);
    dataTypeRegistry.registerByName('Double', floatConv);
    dataTypeRegistry.registerByName('DoubleObject', floatConv);

    // Decimal / Integer (big numbers)
    const bigConv = { fromString: (s: string) => s, toString: (v: string) => v ?? '0' };
    dataTypeRegistry.registerByName('Decimal', bigConv);
    dataTypeRegistry.registerByName('Integer', bigConv);
    dataTypeRegistry.registerByName('NonNegativeInteger', bigConv);
    dataTypeRegistry.registerByName('NonPositiveInteger', bigConv);
    dataTypeRegistry.registerByName('NegativeInteger', bigConv);
    dataTypeRegistry.registerByName('PositiveInteger', bigConv);
    dataTypeRegistry.registerByName('UnsignedLong', bigConv);

    // String-like types
    const strConv = { fromString: (s: string) => s, toString: (v: string) => v ?? '' };
    dataTypeRegistry.registerByName('String', strConv);
    dataTypeRegistry.registerByName('AnySimpleType', strConv);
    dataTypeRegistry.registerByName('AnyURI', strConv);
    dataTypeRegistry.registerByName('NormalizedString', strConv);
    dataTypeRegistry.registerByName('Token', strConv);
    dataTypeRegistry.registerByName('Name', strConv);
    dataTypeRegistry.registerByName('NCName', strConv);
    dataTypeRegistry.registerByName('Language', strConv);
    dataTypeRegistry.registerByName('ID', strConv);
    dataTypeRegistry.registerByName('IDREF', strConv);
    dataTypeRegistry.registerByName('ENTITY', strConv);
    dataTypeRegistry.registerByName('NMTOKEN', strConv);

    // Date/time types (kept as strings — JS Date loses timezone info)
    dataTypeRegistry.registerByName('Date', strConv);
    dataTypeRegistry.registerByName('DateTime', strConv);
    dataTypeRegistry.registerByName('Time', strConv);
    dataTypeRegistry.registerByName('Duration', strConv);
    dataTypeRegistry.registerByName('GDay', strConv);
    dataTypeRegistry.registerByName('GMonth', strConv);
    dataTypeRegistry.registerByName('GMonthDay', strConv);
    dataTypeRegistry.registerByName('GYear', strConv);
    dataTypeRegistry.registerByName('GYearMonth', strConv);

    // QName / NOTATION
    dataTypeRegistry.registerByName('QName', strConv);
    dataTypeRegistry.registerByName('NOTATION', strConv);
  }

  getDataType(name: string): EDataType | null {
    return this._dataTypes.get(name) ?? null;
  }
}

/**
 * Factory for the XMLType package.
 */
class XMLTypeFactory extends BasicEFactory {
  private _ePackage: XMLTypePackageImpl;

  constructor(ePackage: XMLTypePackageImpl) {
    super();
    this._ePackage = ePackage;
  }

  override getEPackage(): EPackage {
    return this._ePackage;
  }

  override create(eClass: EClass): EObject {
    return super.create(eClass);
  }
}
