 /** @module Property */
 
import Base64Property from './Base64';
import BooleanProperty from './Boolean';
import CurrencyProperty from './Currency';
import DateProperty from './Date';
import DateTimeProperty from './DateTime';
import FileProperty from './File';
import FloatProperty from './Float';
import IntegerProperty from './Integer';
import JsonProperty from './Json';
import StringProperty from './String';
import TimeProperty from './Time';
import UuidProperty from './Uuid';

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
	[StringProperty.type]: StringProperty,
	[TimeProperty.type]: TimeProperty,
	[UuidProperty.type]: UuidProperty,
};
export default PropertyTypes;