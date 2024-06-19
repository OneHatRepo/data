 /** @module Property */
 
import Base64Property from './Base64.js';
import BooleanProperty from './Boolean.js';
import CurrencyProperty from './Currency.js';
import DateProperty from './Date.js';
import DateTimeProperty from './DateTime.js';
import FileProperty from './File.js';
import FloatProperty from './Float.js';
import IntegerProperty from './Integer.js';
import JsonProperty, { TagProperty } from './Json.js';
import PercentProperty from './Percent.js';
import PercentIntProperty from './PercentInt.js';
import Property from './Property.js';
import StringProperty from './String.js';
import TimeProperty from './Time.js';
import UuidProperty from './Uuid.js';

const PropertyTypes = {
	[Base64Property.type]: Base64Property,
	[BooleanProperty.type]: BooleanProperty,
	[CurrencyProperty.type]: CurrencyProperty,
	[DateProperty.type]: DateProperty,
	[DateTimeProperty.type]: DateTimeProperty,
	[FileProperty.type]: FileProperty,
	[FloatProperty.type]: FloatProperty,
	[IntegerProperty.type]: IntegerProperty,
	[JsonProperty.type]: JsonProperty,
	[PercentProperty.type]: PercentProperty,
	[PercentIntProperty.type]: PercentIntProperty,
	[Property.type]: Property,
	[StringProperty.type]: StringProperty,
	[TagProperty.type]: TagProperty,
	[TimeProperty.type]: TimeProperty,
	[UuidProperty.type]: UuidProperty,
};
export default PropertyTypes;