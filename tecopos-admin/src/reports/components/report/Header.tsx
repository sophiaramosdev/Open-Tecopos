import { Image as Logo, StyleSheet, Text, View } from '@react-pdf/renderer';
import { BusinessInterface } from '../../../interfaces/ServerInterfaces';
import APIMediaServer from '../../../api/APIMediaServer';
import { blobToDataURL } from '../../helpers/commons';

const styles = StyleSheet.create({
  headerContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    border: 0,
    fontFamily: 'OpenSans',
    fontSize: 9,
    paddingBottom: 28,
  },
  logoContainer: {
    flexBasis: '50%',
    alignItems: 'flex-start',
  },
  businessLogo: {
    height: 85.4,
    objectFit: 'contain',
    paddingLeft: 0.9,
  },
  infoContainer: {
    flexBasis: '50%',
  },
  businessName: {
    fontWeight: 'bold',
  },
  businessAddress: {
    //flexWrap: 'wrap',
  },
});

interface HeaderProps {
  data: Partial<BusinessInterface>;
}

const defaultLogo = require('../../../assets/image-default.jpg');

const Header = ({ data }: HeaderProps) => {
  const getBusinessLogo = async (logoId: number) => {
    try {
      const response = await APIMediaServer.get('/files/' + logoId, {
        responseType: 'blob',
      });
      return await blobToDataURL(response.data);
    } catch (error) {
      console.error(error);
      return defaultLogo;
    }
  };

  let businessAddress: Array<string> = [];
  if (data.address) {
    const {
      street_1,
      street_2,
      city,
      postalCode,
      municipality,
      province,
      country,
    } = data.address;
    let addresPart = street_1;
    if (street_2) addresPart += ', ' + street_2;
    businessAddress.push(addresPart);
    if (city) addresPart = city;
    if (postalCode) addresPart += ', ' + postalCode;
    businessAddress.push(addresPart);
    if (municipality) businessAddress.push(municipality.name);
    if (province) businessAddress.push(province.name);
    if (country) businessAddress.push(country.name);
    if (data.email) businessAddress.push(data.email);
    if (data.phones)
      businessAddress.push(data.phones.map((phone) => phone.number).join('\n'));
  }

  return (
    // Header
    <View style={styles.headerContainer}>
      <View style={styles.logoContainer}>
        <Logo
          style={styles.businessLogo}
          //@ts-ignore
          src={data.logo ? getBusinessLogo(data.logo.id) : defaultLogo}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.businessName}>{data.name}</Text>
        {businessAddress.map((addressPart, idx) => (
          <Text key={idx} style={styles.businessAddress}>{addressPart}</Text>
        ))}
      </View>
    </View>
  );
};
export default Header;
