import path from 'node:path';
import url from 'node:url';


export default {
  
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../', 
  title: 'Foo', 
  version: '1.0.0', 
  description: '',
  tagIndex: 2,
  info: {
    title: 'Tecopos-auth Microservice',
    version: '1.0.0',
    description: '',
  },
  snakeCase: true,

  debug: true, 
  ignore: ['/swagger', '/docs'],
  preferredPutPatch: 'PATCH', 
  common: {
    parameters: {}, 
    headers: {}, 
  },
  securitySchemes: {}, // optional
  authMiddlewares: ['auth', 'auth:api'], 
  defaultSecurityScheme: 'BearerAuth', 
  persistAuthorization: true, 
  showFullPath: false, 
};
