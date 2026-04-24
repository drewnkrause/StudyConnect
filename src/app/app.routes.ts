import { Routes } from '@angular/router';
import { Registration } from './pages/registration/registration';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Group } from './pages/group/group';

export const routes: Routes = [
    {path: '', component: Dashboard },
    {path: 'register', component: Registration },
    {path: 'login', component: Login },
    {path: 'groups', component: Group }
];
