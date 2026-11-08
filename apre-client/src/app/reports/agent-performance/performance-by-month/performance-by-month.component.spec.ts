import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ChartComponent } from '../../../shared/chart/chart.component';
import { environment } from '../../../../environments/environment';
import { PerformanceByMonthComponent } from './performance-by-month.component';

// M-085: verify HTTP interactions and the report's rendered states.
describe('PerformanceByMonthComponent', () => {
  let fixture: ComponentFixture<PerformanceByMonthComponent>;
  let component: PerformanceByMonthComponent;
  let httpMock: HttpTestingController;
  const url = `${environment.apiBaseUrl}/reports/agent-performance/performance-by-month?month=1`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, PerformanceByMonthComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(PerformanceByMonthComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiBaseUrl}/reports/agent-performance/performance-by-month?view=years`)
      .flush([2024, 2023]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    fixture.destroy();
  });

  it('loads available years and charts the selected month and year', () => {
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Agent Performance by Month');
    component.monthForm.controls.month.setValue(1);
    component.monthForm.controls.year.setValue(2024);
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', {});
    expect(Array.from(fixture.nativeElement.querySelector('#year').options)
      .map((option: any) => option.textContent.trim())).toEqual(['Select a year', '2024', '2023']);
    const request = httpMock.expectOne(`${url}&year=2024`);
    expect(request.request.method).toBe('GET');
    request.flush([
      { agentId: 1024, name: 'Agent 1024 (name unavailable)', averagePerformance: 85 }
    ]);
    fixture.detectChanges();
    const chart = fixture.debugElement.query(By.directive(ChartComponent)).componentInstance as ChartComponent;
    expect(chart.labels).toEqual(['Agent 1024 (name unavailable)']);
    expect(chart.data).toEqual([85]);
    expect(component.loading).toBeFalse();
    component.monthForm.controls.year.setValue(2023);
    component.onSubmit();
    httpMock.expectOne(`${url}&year=2023`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No data found for January 2023');
    expect(fixture.nativeElement.querySelector('app-chart')).toBeNull();
  });

  it('requires both month and year without sending a report request', () => {
    component.onSubmit();
    fixture.detectChanges();
    expect(component.monthForm.invalid).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Please select a month');
    component.monthForm.controls.month.setValue(1);
    component.monthForm.controls.year.setValue(null);
    component.onSubmit();
    expect(component.monthForm.invalid).toBeTrue();
    httpMock.expectNone(request => request.url.includes('performance-by-month'));
  });

  it('shows empty and failure messages and clears previous chart data', () => {
    component.monthForm.controls.month.setValue(1);
    component.agents = ['Previous Agent'];
    component.performanceData = [90];
    component.onSubmit();
    httpMock.expectOne(`${url}&year=2024`).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No data found for January');
    expect(fixture.nativeElement.querySelector('app-chart')).toBeNull();
    expect(component.performanceData).toEqual([]);

    component.agents = ['Previous Agent'];
    component.performanceData = [90];
    component.onSubmit();
    httpMock.expectOne(`${url}&year=2024`).flush('Unavailable', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load agent performance.');
    expect(fixture.nativeElement.querySelector('app-chart')).toBeNull();
    expect(component.performanceData).toEqual([]);
    expect(component.loading).toBeFalse();
  });
});
