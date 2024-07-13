import User from '#models/user'
import {HttpContext} from '@adonisjs/core/http'

export default class UsersController {
      public async index({ request, response }: HttpContext) {
    
    return response.send({
        request:request.body,
        id:1,
        username:'Pepe'
      })
  }

  public async create({request, response}: HttpContext){
  const {username, email, password} = request.all();
  
  
  if (!username ||!password ||!email) {
   
    return response.status(400).send({
      message: "Error creating user",
      errors: ["Username, password or email cannot be empty"]
    });
  }

  try {
    const user = await User.create({
      username,
      email,
      password
    });

    return user;
  } catch (error) {
    
    
    return response.status(500).send({
      message: "Internal Server Error",
      errors: [error.message]
    });
  }
}

}