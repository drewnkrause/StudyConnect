import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowseGroups } from './browse-groups';

describe('BrowseGroups', () => {
  let component: BrowseGroups;
  let fixture: ComponentFixture<BrowseGroups>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseGroups],
    }).compileComponents();

    fixture = TestBed.createComponent(BrowseGroups);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
