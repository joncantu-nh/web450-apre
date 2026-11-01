import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { MonthlySalesComponent } from './monthly-sales.component';

describe('MonthlySalesComponent', () => {
  let fixture: ComponentFixture<MonthlySalesComponent>;
  let httpMock: HttpTestingController;
  const url = `${environment.apiBaseUrl}/reports/sales/monthly`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MonthlySalesComponent]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MonthlySalesComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch monthly sales and display them in the table', () => {
    const request = httpMock.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([
      { month: '2025-12', totalSales: 1000 },
      { month: '2026-01', totalSales: 1500 }
    ]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('2025-12');
    expect(rows[0].textContent).toContain('1000');
    expect(rows[1].textContent).toContain('2026-01');
    expect(rows[1].textContent).toContain('1500');
  });

  it('should display a message when there are no monthly sales', () => {
    httpMock.expectOne(url).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No monthly sales data found.');
    expect(fixture.nativeElement.querySelector('app-table')).toBeNull();
  });

  it('should display an error when the request fails', () => {
    httpMock.expectOne(url).flush('Database unavailable', {
      status: 500,
      statusText: 'Internal Server Error'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unable to load monthly sales.');
    expect(fixture.nativeElement.querySelector('app-table')).toBeNull();
  });
});
