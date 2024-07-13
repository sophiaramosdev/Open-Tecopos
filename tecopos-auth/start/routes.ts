import AutoSwagger from 'adonis-autoswagger';

import router from '@adonisjs/core/services/router';
import swagger from '#config/swagger';
import UsersController from '#controllers/UsersController';

router.get('/users',[UsersController, 'index'])

router.post('/users',[UsersController, 'create'])


router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})


router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger);
  
})
