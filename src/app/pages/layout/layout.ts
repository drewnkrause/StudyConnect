import { Component } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [Navbar, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {}
