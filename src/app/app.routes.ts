import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Group } from './pages/group/group';
import { Login } from './pages/login/login';
import { Registration } from './pages/registration/registration';
import { Account } from './pages/account/account';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Dashboard, canActivate: [authGuard] },
  { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
  { path: 'groups/:id', component: Group, canActivate: [authGuard] },
  { path: 'account', component: Account, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Registration },
  { path: '**', redirectTo: '' },
];
