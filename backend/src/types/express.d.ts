import { User } from './database';

declare global {
  namespace Express {
    interface User extends User {}
    
    interface Request {
      user?: User;
    }
  }
}

