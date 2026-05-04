import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Group } from './pages/group/group';
import { Login } from './pages/login/login';
import { Registration } from './pages/registration/registration';
import { Account } from './pages/account/account';
import { authGuard } from './guards/auth-guard';
import { CreateGroup } from './pages/create-group/create-group';
import { BrowseGroups } from './pages/browse-groups/browse-groups';
import { Layout } from './pages/layout/layout';

export const routes: Routes = [
  // { path: '', component: Dashboard, canActivate: [authGuard] },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'groups', component: Group },
      { path: 'account', component: Account },
      { path: 'groups/create', component: CreateGroup },
      { path: 'groups/browse', component: BrowseGroups },
      { path: 'groups/:id', component: Group },
    ],
  },

  { path: 'login', component: Login },
  { path: 'register', component: Registration },
  { path: '**', redirectTo: '' },
];
