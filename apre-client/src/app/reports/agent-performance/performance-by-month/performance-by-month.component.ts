import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChartComponent } from '../../../shared/chart/chart.component';
import { environment } from '../../../../environments/environment';

interface AgentPerformance {
  agentId: number | string;
  name: string;
  averagePerformance: number;
}

// M-085: reuse the monthly feedback form and shared chart patterns.
@Component({
  selector: 'app-performance-by-month',
  standalone: true,
  imports: [ReactiveFormsModule, ChartComponent],
  template: `
    <h1>Agent Performance by Month</h1>
    <div class="report-container">
      <form class="form" [formGroup]="monthForm" (ngSubmit)="onSubmit()">
        <div class="form__group">
          <label class="label" for="month">Month</label>
          <select class="select" id="month" formControlName="month">
            <option [ngValue]="null">Select a month</option>
            @for (month of months; track $index) {
              <option [ngValue]="$index + 1">{{ month }}</option>
            }
          </select>
        </div>
        <div class="form__group">
          <label class="label" for="year">Year</label>
          <select class="select" id="year" formControlName="year">
            <option [ngValue]="null">Select a year</option>
            @for (year of years; track year) {
              <option [ngValue]="year">{{ year }}</option>
            }
          </select>
        </div>
        <p>Average performance for the selected month and year.</p>
        @if (yearError) { <p class="message message--error" role="alert">{{ yearError }}</p> }
        <div class="form__actions">
          <button class="button button--primary" type="submit" [disabled]="loading">Submit</button>
        </div>
      </form>
      @if (errorMessage) {
        <p class="message message--error" role="alert">{{ errorMessage }}</p>
      }
      @if (loading) {
        <p role="status">Loading agent performance...</p>
      }
      @if (agents.length) {
        <div class="card chart-card">
          <app-chart [type]="'bar'" [label]="'Average Agent Performance'"
            [data]="performanceData" [labels]="agents" />
        </div>
      }
    </div>
  `,
  styles: `
    .report-container { display: flex; flex-direction: column; align-items: center; }
    .form, .chart-card { width: 100%; max-width: 650px; margin: 20px 0; }
  `
})
export class PerformanceByMonthComponent implements OnInit {
  years: number[] = [];
  yearError = '';
  months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  agents: string[] = [];
  performanceData: number[] = [];
  errorMessage = '';
  loading = false;
  monthForm = this.fb.group({
    month: [null as number | null, Validators.required],
    year: [null as number | null, Validators.required]
  });

  constructor(private http: HttpClient, private fb: FormBuilder) { }

  ngOnInit(): void {
    // Derive selectable years from the data instead of maintaining a fixed list.
    this.http.get<number[]>(
      `${environment.apiBaseUrl}/reports/agent-performance/performance-by-month?view=years`
    ).subscribe({
      next: years => {
        this.years = years;
        const currentYear = new Date().getFullYear();
        this.monthForm.controls.year.setValue(years.includes(currentYear) ? currentYear : (years[0] ?? null));
        if (!years.length) this.yearError = 'No report years available.';
      },
      error: () => this.yearError = 'Unable to load report years. Reload the page to try again.'
    });
  }

  onSubmit(): void {
    if (this.loading) return;
    // Clear the previous result so validation, empty results, and failures never show stale data.
    this.agents = [];
    this.performanceData = [];
    this.errorMessage = '';
    if (this.monthForm.invalid) {
      this.errorMessage = 'Please select a month and year';
      return;
    }
    const month = this.monthForm.controls.month.value!;
    const year = this.monthForm.controls.year.value;
    const yearQuery = `&year=${year}`;
    this.loading = true;
    this.http.get<AgentPerformance[]>(
      `${environment.apiBaseUrl}/reports/agent-performance/performance-by-month?month=${month}${yearQuery}`
    ).subscribe({
      next: data => {
        this.loading = false;
        this.agents = data.map(agent => agent.name);
        this.performanceData = data.map(agent => agent.averagePerformance);
        if (!data.length) this.errorMessage = `No data found for ${this.months[month - 1]} ${year}`;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load agent performance.';
      }
    });
  }
}
