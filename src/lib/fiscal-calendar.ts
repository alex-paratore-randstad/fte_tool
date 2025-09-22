
import { startOfWeek, addMonths, subMonths, parse, getYear, getMonth, addWeeks } from 'date-fns';

type FiscalCalendarEntry = {
  day: string;
  week: string;
  reporting_month: string;
  reporting_year: string;
};

// This is a large dataset, so it's best to keep it in its own file.
// In a real-world scenario, this might come from an API or a database.
const fiscalCalendarData: FiscalCalendarEntry[] = [
  { day: '1/10/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/15/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/14/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/11/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/12/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/13/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/9/2023', week: '2', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/18/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/16/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/20/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/22/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/17/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/21/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/19/2023', week: '3', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/27/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/25/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/26/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/28/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/23/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/29/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/24/2023', week: '4', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/2/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/3/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/7/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/6/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/5/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/8/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '1/4/2023', week: '1', reporting_month: 'Jan', reporting_year: '2023' },
  { day: '2/8/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/12/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/10/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/7/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/9/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/6/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/11/2023', week: '6', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/19/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/13/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/16/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/14/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/18/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/17/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/15/2023', week: '7', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/21/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/26/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/25/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/22/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/24/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/23/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/20/2023', week: '8', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/5/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '1/30/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '1/31/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/4/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/1/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/3/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '2/2/2023', week: '5', reporting_month: 'Feb', reporting_year: '2023' },
  { day: '3/10/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/12/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/7/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/6/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/9/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/11/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/8/2023', week: '10', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/14/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/15/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/13/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/16/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/19/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/18/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/17/2023', week: '11', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/21/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/20/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/22/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/23/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/26/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/24/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/25/2023', week: '12', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/5/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/4/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/2/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/1/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/3/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '2/27/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '2/28/2023', week: '9', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '4/1/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/28/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/27/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/29/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/31/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '4/2/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '3/30/2023', week: '13', reporting_month: 'Mar', reporting_year: '2023' },
  { day: '4/14/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/11/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/10/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/16/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/13/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/15/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/12/2023', week: '15', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/20/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/22/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/18/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/17/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/23/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/21/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/19/2023', week: '16', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/26/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/25/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/27/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/28/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/30/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/24/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/29/2023', week: '17', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/9/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/4/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/7/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/3/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/6/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/8/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '4/5/2023', week: '14', reporting_month: 'Apr', reporting_year: '2023' },
  { day: '5/13/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/12/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/14/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/11/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/10/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/8/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/9/2023', week: '19', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/15/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/19/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/16/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/20/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/21/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/18/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/17/2023', week: '20', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/25/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/24/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/23/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/26/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/22/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/28/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/27/2023', week: '21', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/6/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/2/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/5/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/4/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/7/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/3/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '5/1/2023', week: '18', reporting_month: 'May', reporting_year: '2023' },
  { day: '6/10/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/7/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/11/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/6/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/5/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/8/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/9/2023', week: '23', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/18/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/13/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/17/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/14/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/16/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/12/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/15/2023', week: '24', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/25/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/24/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/20/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/21/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/22/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/23/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/19/2023', week: '25', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '5/29/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '5/30/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '5/31/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/4/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/1/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/3/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/2/2023', week: '22', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/27/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '7/2/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/26/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/29/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/30/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '7/1/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '6/28/2023', week: '26', reporting_month: 'Jun', reporting_year: '2023' },
  { day: '7/16/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/14/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/11/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/13/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/10/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/15/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/12/2023', week: '28', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/19/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/23/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/21/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/17/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/18/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/22/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/20/2023', week: '29', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/26/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/28/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/29/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/25/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/30/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/24/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/27/2023', week: '30', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/9/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/8/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/6/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/4/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/7/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/3/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '7/5/2023', week: '27', reporting_month: 'Jul', reporting_year: '2023' },
  { day: '8/9/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/12/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/8/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/13/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/7/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/11/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/10/2023', week: '32', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/15/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/19/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/18/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/14/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/16/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/20/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/17/2023', week: '33', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/23/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/21/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/27/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/25/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/26/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/22/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/24/2023', week: '34', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/3/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/4/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/6/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/2/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/1/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '8/5/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '7/31/2023', week: '31', reporting_month: 'Aug', reporting_year: '2023' },
  { day: '9/25/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/29/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/28/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/30/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/26/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '10/1/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/27/2023', week: '39', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/4/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/5/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/6/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/8/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/7/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/10/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/9/2023', week: '36', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/17/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/12/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/15/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/13/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/16/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/14/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/11/2023', week: '37', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/24/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/23/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/18/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/21/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/19/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/22/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/20/2023', week: '38', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '8/29/2023', week: '35', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '8/30/2023', week: '35', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '8/31/2023', week: '35', reporting_month": "Sep", "reporting_year": "2023" },
  { day: '9/3/2023', week: '35', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/1/2023', week: '35', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '9/2/2023', week: '35', reporting_month: 'Sep', reporting_year: '2023' },
  { day: '8/28/2023', week: '35', reporting_month: 'Sep', reporting_year: '2023' }
];

// Sort the data by year, month, and day for reliable processing.
const monthMap: { [key: string]: number } = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

const parsedCalendar = fiscalCalendarData.map(d => ({...d, date: parse(d.day, 'M/d/yyyy', new Date())}))
    .sort((a, b) => a.date.getTime() - b.date.getTime());


/**
 * Finds the fiscal calendar information for a given date.
 * @param date The date to find fiscal information for.
 * @returns The fiscal calendar entry for the given date, or undefined if not found.
 */
export function getFiscalDataForDate(date: Date): FiscalCalendarEntry | undefined {
    const dateString = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return fiscalCalendarData.find(d => d.day === dateString);
}


/**
 * Returns an array of Date objects representing the start of each week
 * in the fiscal month that the given date belongs to.
 * @param date The date to find the fiscal month for.
 * @returns An array of week-starting dates.
 */
export function getWeeksForFiscalMonth(date: Date): Date[] {
  const currentFiscalData = getFiscalDataForDate(date);
  if (!currentFiscalData) {
    // Fallback to standard 4-week block if date is not in fiscal calendar
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 4 }, (_, i) => addWeeks(start, i));
  }

  const { reporting_month, reporting_year } = currentFiscalData;

  const weeksInMonth = parsedCalendar.filter(
    d => d.reporting_month === reporting_month && d.reporting_year === reporting_year
  );

  const uniqueWeeks = [...new Map(weeksInMonth.map(item => [item['week'], item])).values()];
  
  return uniqueWeeks.map(d => startOfWeek(d.date, { weekStartsOn: 1 }));
}


/**
 * Gets the start date of the previous fiscal month.
 * @param currentDate The current date.
 * @returns A Date object for the first day of the previous fiscal month.
 */
export function getPreviousFiscalMonth(currentDate: Date): Date {
  const currentFiscalData = getFiscalDataForDate(currentDate);
  if (!currentFiscalData) {
    return subMonths(currentDate, 1);
  }

  const currentMonthIndex = monthMap[currentFiscalData.reporting_month];
  const currentYear = parseInt(currentFiscalData.reporting_year, 10);

  let prevMonthIndex = currentMonthIndex - 1;
  let prevYear = currentYear;

  if (prevMonthIndex === 0) {
    prevMonthIndex = 12;
    prevYear--;
  }

  const prevMonthName = Object.keys(monthMap).find(key => monthMap[key] === prevMonthIndex);

  const firstDayOfPrevFiscalMonth = parsedCalendar.find(
    d => d.reporting_month === prevMonthName && d.reporting_year === prevYear.toString()
  );

  return firstDayOfPrevFiscalMonth ? firstDayOfPrevFiscalMonth.date : subMonths(currentDate, 1);
}

/**
 * Gets the start date of the next fiscal month.
 * @param currentDate The current date.
 * @returns A Date object for the first day of the next fiscal month.
 */
export function getNextFiscalMonth(currentDate: Date): Date {
    const currentFiscalData = getFiscalDataForDate(currentDate);
    if (!currentFiscalData) {
        return addMonths(currentDate, 1);
    }

    const currentMonthIndex = monthMap[currentFiscalData.reporting_month];
    const currentYear = parseInt(currentFiscalData.reporting_year, 10);
    
    let nextMonthIndex = currentMonthIndex + 1;
    let nextYear = currentYear;

    if (nextMonthIndex > 12) {
        nextMonthIndex = 1;
        nextYear++;
    }

    const nextMonthName = Object.keys(monthMap).find(key => monthMap[key] === nextMonthIndex);

    const firstDayOfNextFiscalMonth = parsedCalendar.find(
        d => d.reporting_month === nextMonthName && d.reporting_year === nextYear.toString()
    );

    return firstDayOfNextFiscalMonth ? firstDayOfNextFiscalMonth.date : addMonths(currentDate, 1);
}
