import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { TableComponent } from '../../../shared/table/table.component';

interface MonthlySale {
  month: string;
  totalSales: number;
}

@Component({
  selector: 'app-monthly-sales',
  standalone: true,
  imports: [TableComponent],
  template: `
    <h1>Monthly Sales Report</h1>
    @if (errorMessage) {
      <p>{{ errorMessage }}</p>
    } @else if (loading) {
      <p>Loading monthly sales...</p>
    } @else if (salesData.length > 0) {
      <app-table
        [title]="'Monthly Sales'"
        [data]="salesData"
        [headers]="['Month', 'Total Sales']"
        [sortableColumns]="['Month', 'Total Sales']"
        [headerBackground]="'secondary'"
      />
    } @else {
      <p>No monthly sales data found.</p>
    }
  `
})
export class MonthlySalesComponent implements OnInit {
  salesData: { Month: string; 'Total Sales': number }[] = [];
  loading = true;
  errorMessage = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Load monthly sales totals when the report opens.
    this.http.get<MonthlySale[]>(`${environment.apiBaseUrl}/reports/sales/monthly`).subscribe({
      next: (data) => {
        // TableComponent uses column headers as keys for each row.
        this.salesData = data.map(sale => ({
          Month: sale.month,
          'Total Sales': sale.totalSales
        }));
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load monthly sales.';
        this.loading = false;
      }
    });
  }
}
