import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(private firebaseService: FirebaseService) {}

  async validateUser(idToken: string) {
    try {
      const decodedToken = await this.firebaseService.verifyIdToken(idToken);
      return decodedToken;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async createUser(createUserDto: CreateUserDto) {
    const firestore = this.firebaseService.getFirestore();
    const userRef = firestore.collection('users').doc(createUserDto.uid);
    
    const userData = {
      uid: createUserDto.uid,
      email: createUserDto.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRef.set(userData);
    return userData;
  }

  async getUser(uid: string) {
    const firestore = this.firebaseService.getFirestore();
    const userDoc = await firestore.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return { id: userDoc.id, ...userDoc.data() };
  }
}