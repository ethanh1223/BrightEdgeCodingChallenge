class SortableTable {
  constructor() {
    this.rawDataArray = [];
    this.tableData = [];
    this.tableHeaders = [];
    this.currentSort = {criterion: 1, ascending: true};
    this.paginationObj = {page: 1};
    this.paginationButtonsArray = [];
    this.table = document.createElement('table');
    this.filtered = false;
    this.filteredTableData = [];
    this.hiddenColumns = [];
  }



  run() {
    const xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = () => { 
      if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
        this.rawDataArray = JSON.parse(xmlHttp.responseText);

        //Create table based on headers in data (makes our table adaptable to changes in data structure)
        this.createAndRenderTable();

        //Create and render searchBar component, which filters data.
        this.createAndRenderSearchBar();

        //Create table rows and push into array to simplify future sorting (initially sorted by rating)
        this.createTableRows();

        //Render table rows
        this.renderTableRows(this.paginationObj.page);

        //Render pagination controls (with correct page numbers)
        this.renderPaginationControls();
      }
    }

    xmlHttp.open("GET", '/data', true); 
    xmlHttp.send();
  };






  //*** General Rendering ***

  createAndRenderSearchBar() {
    //Create the following:
      //Form container -> wrap input and submit in form so we can submit with enter or click
      //Search Bar -> text input from which we capture search term
      //Submit Button -> triggers form submission
      //Clear filter button -> Only rendered AFTER a user has searched. Clears existing filters
      //Error message -> Only rendered if user search yields no results.
    const formContainer = document.createElement('form');
    const searchBar = document.createElement('input');
    const submitButton = document.createElement('input');
    const clearFilterButton = document.createElement('input');
    const errorMsg = document.createElement('h3');

    //Set search bar initial state
    searchBar.setAttribute('type', 'text');
    searchBar.setAttribute('placeholder', 'Enter search term');

    //Set error msg initial state -> HIDDEN until needed
    errorMsg.innerHTML = 'No results found. Please try again';
    errorMsg.style.display = 'none';

    //Set submit button initial state
    //Set up event listener to submitform on button click
    submitButton.setAttribute('type', 'button');
    submitButton.setAttribute('value', 'Submit');
    submitButton.addEventListener('click', (e) => {
      e.preventDefault();
      const form = e.target.parentNode;
      this.searchFormSubmitEventListener(form);
    })

    //Set up event listener to submit form
    formContainer.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      this.searchFormSubmitEventListener(form);
    })
    formContainer.setAttribute('id', 'searchBarContainer');

    //Set clear filter initial state -> HIDDEN until user has searched
    //Set up event listener to clear filtering when clicked
    clearFilterButton.style.display = 'none';
    clearFilterButton.setAttribute('type', 'button');
    clearFilterButton.setAttribute('value', 'Clear Filters');
    clearFilterButton.setAttribute('id', 'clearFilterButton');
    clearFilterButton.addEventListener('click', (e) => {
      this.filteredTableData = [];
      this.filtered = false;
      clearFilterButton.style.display = 'none';
      this.renderTableRows();
    })

    //Add searchBar and submitButton as children of form container
    formContainer.appendChild(searchBar);
    formContainer.appendChild(submitButton);

    //Render formContainer, clearFilterButton, and errorMsg (latter two are initially hidden)
    document.body.insertBefore(formContainer, this.table);
    document.body.insertBefore(clearFilterButton, this.table);
    document.body.insertBefore(errorMsg, clearFilterButton);
  }



  createAndRenderTable() {

    //Create header row -> will append 'th'nodes
    const headerRow = document.createElement('tr');
    headerRow.setAttribute('id', 'columnTitles');

    //Loop through one data entry and create headers from keys
    for (const key in this.rawDataArray[0]) {

      //create header -> will append text, sort, and hide column nodes
      const header = document.createElement('th');

      //Create text node that will contain header name
      const headerTextNode = document.createElement('span');
      headerTextNode.classList.add('headerTextNode');

      //Create 'headerText' to store text that will actually be displayed as header
      //Use reg-ex to split text on capital letters, then capitalize the first letter of each word and join on spaces
      let headerText = key.split(/(?=[A-Z])/);
      headerText[0] = headerText[0][0].toUpperCase() + headerText[0].slice(1, headerText[0].length)
      headerText = headerText.join(' ');

      //Set content of headerTextNode to be formatted string headerText and append to header
      headerTextNode.innerHTML = headerText;
      header.appendChild(headerTextNode);

      //Track all tableHeaders as property on class to simplify future sorting/showing/hiding
      this.tableHeaders.push(header);

      //Create sort button and attach event listener that triggers sort on click
      const sortButton = document.createElement('img');
      sortButton.addEventListener('click', () => {
        this.reSortTableRows(this.tableHeaders.indexOf(sortButton.parentNode))
      })

      //Create button and attach event listener to hide given column when clicked
      const hideColumnButton = document.createElement('input');
      hideColumnButton.addEventListener('click', () => {
        this.hideColumnButtonEventListener(hideColumnButton);
      })

      //Set initial hideColumnButton state
      hideColumnButton.setAttribute('type', 'button');
      hideColumnButton.setAttribute('value', 'Hide');

      //Add class for basic CSS styling
      hideColumnButton.classList.add('hideColumnButton');

      //Append sort button and hide column button to header node
      header.appendChild(sortButton);
      header.appendChild(hideColumnButton);

      //Append header node to header row
      headerRow.appendChild(header);
    }

    //Create hiddenColumnsNode, which will serve as container for all future "undoHiddenColumnNode"s
    const hiddenColumnsNode = document.createElement('div');

    //Create text node as child to simplify future appending of "undoHiddenColumnNode"s
    const hiddenColumnsText = document.createElement('span');
    hiddenColumnsText.innerHTML = 'The following columns are hidden. To show, please click the column title: '
    hiddenColumnsNode.appendChild(hiddenColumnsText);

    //Set initial state for hiddenColumnsNode container -> not displayed until user hides a column
    hiddenColumnsNode.style.display = 'none';
    hiddenColumnsNode.setAttribute('id', 'hiddenColumnsNode');

    //Append HiddenColumnsNode above SearchBar container
    document.body.appendChild(hiddenColumnsNode);

    //Append header to table and table to DOM
    this.table.appendChild(headerRow);
    document.body.appendChild(this.table);

    //Render the correct sort buttons on each header node (see method for details)
    this.renderSortButtons();
  };



  //Generates nodes for each row of table
  //Does NOT render them to DOM
  createTableRows() {

    //Loop through raw dataset and create row for each entry
    this.rawDataArray.forEach(tableRow => {
      //Storage for all elements on this row
      const tdNodes = [];

      //Create row element
      const currentRow = document.createElement('tr');

      //Create data elements for each column
      const nameData = document.createElement('td');
      const rankingData = document.createElement('td');
      const activeDailyUsersData = document.createElement('td');
      const founderData = document.createElement('td');
      const locationData = document.createElement('td');

      //Set properties per data
      nameData.innerHTML = tableRow.name;
      rankingData.innerHTML = tableRow.storeRanking;
      activeDailyUsersData.innerHTML = tableRow.activeDailyUsers;
      founderData.innerHTML = tableRow.founder;
      locationData.innerHTML = tableRow.location;

      //Push into storage
      tdNodes.push(nameData);
      tdNodes.push(rankingData);
      tdNodes.push(activeDailyUsersData);
      tdNodes.push(founderData);
      tdNodes.push(locationData);

      //Loop through each node on row
        //Append to row node
        //add event listener that allows for cell editing
      tdNodes.forEach((dataNode) => {
        currentRow.appendChild(dataNode);
        dataNode.addEventListener('click', (e) => {
          this.cellEditorEventListener(e, currentRow);
        })
      })

      //Push finished row into "tableData". 
      //TableData will serve as our storage for all nodes moving forward
      //And will serve as our basis for sorting/filtering
      this.tableData.push(currentRow);
    })

    //Initialize table to be sorted by Store Ranking
    this.tableData.sort((a, b) => a.children[this.currentSort.criterion].innerHTML - b.children[this.currentSort.criterion].innerHTML)

  };



  //Renders tableRows to the DOM
  //Broken out seperately from above function so we can re-render on sort/filter WITHOUT generating new DOM elements
  renderTableRows() {

    //Always initialize error message to be hidden when rendering rows
    const errorMsg = document.querySelector('h3')
    errorMsg.style.display = 'none';

    //Grab all table rows from the DOM
    //One row (headers) should always be rendered
      //If there is anything else rendered, get rid of it before rendering new content
    var rows = document.querySelectorAll('tr');
    for (var k = rows.length - 1; k > 0; k--) {
      rows[k].remove();
    }

    //Grab buttonContainer so we can render new rows before it
    const buttonContainer = document.getElementById('buttonContainer');

    //This is where PAGINATION takes place
    //In this app, a page has 10 elements OR, if there are less than 10 total elements, a page has the total # of elements

    //If the data is filtered
    if (this.filtered) {

      //If the filters yielded results
        //Render the page
      if (this.filteredTableData.length) {
        for (var i = (this.paginationObj.page - 1) * 10; i < Math.min((this.paginationObj.page - 1) * 10 + 10, this.filteredTableData.length); i++) {
          this.table.insertBefore(this.filteredTableData[i], buttonContainer);
        }

      //If the filters yielded no results
        //"Un-hide" error message
      } else {;
        errorMsg.style.display = 'block';
      }

    //Else if the data is NOT filtered
      //Render the page
    } else {
      for (var i = (this.paginationObj.page - 1) * 10; i < Math.min((this.paginationObj.page - 1) * 10 + 10, this.tableData.length); i++) {
        this.table.insertBefore(this.tableData[i], buttonContainer);
      }
    }
  };



  //After a sort takes place, re-render correct buttons on headers
  renderSortButtons() {
    for (var i = 0; i < this.tableHeaders.length; i++) {
      
    //Since we are tracking sorting criterion by index of the column, we just check
      //If current column is the current sorting criterion
      if (i === this.currentSort.criterion) {

        //If sort is ascending, render up arrow
        if (this.currentSort.ascending) {
          this.tableHeaders[i].children[1].setAttribute('src', 'upArrow.svg');

        //Else, render down arrow 
        } else {
          this.tableHeaders[i].children[1].setAttribute('src', 'downArrow.svg');
        }

      //If current column is NOT the current sorting criterion
      } else {

        //Render generic "sort" icon with up and down arrows
        this.tableHeaders[i].children[1].setAttribute('src', 'sortIcon.svg');
      }
    }
  }



  renderPaginationControls() {

    //Create buttons for each page
    const buttonContainer = document.createElement('div');
    const pageButtonOne = document.createElement('input');
    const pageButtonTwo = document.createElement('input');
    const pageButtonThree = document.createElement('input');
    const pageButtonFour = document.createElement('input');
    const pageButtonFive = document.createElement('input');

    //Store on class so pageNumbers function can also access
    this.paginationButtonsArray.push(pageButtonOne);
    this.paginationButtonsArray.push(pageButtonTwo);
    this.paginationButtonsArray.push(pageButtonThree);
    this.paginationButtonsArray.push(pageButtonFour);
    this.paginationButtonsArray.push(pageButtonFive);

    //Set initial button state and attach event handler than renders next page
    this.paginationButtonsArray.forEach((button => {
      button.setAttribute('type', 'button');
      button.addEventListener('click', (e) => {
        this.pageChangeClickHandler(e)
      })
    }))

    //Set initial page numbers
    this.setPageNumbers(this.paginationObj, this.paginationButtonsArray);

    buttonContainer.setAttribute('id', 'buttonContainer');

    //Append all buttons to container
    buttonContainer.appendChild(pageButtonOne);
    buttonContainer.appendChild(pageButtonTwo);
    buttonContainer.appendChild(pageButtonThree);
    buttonContainer.appendChild(pageButtonFour);
    buttonContainer.appendChild(pageButtonFive);

    //Append container to table
    this.table.appendChild(buttonContainer);
  }





  //*** Data Creation and Modification ***

  reSortTableRows(sortingCriterion) {

    //If user clicks on column which we are already sorting by
    if (sortingCriterion === this.currentSort.criterion) {

      //Sort by the opposite (ascending to descending and vice versa)
      this.currentSort.ascending = !this.currentSort.ascending;

    //If user clicks a new column, sort by that column in ascending order
    } else {
      this.currentSort.criterion = sortingCriterion;
      this.currentSort.ascending = true;
    }

    //If data is filtered, execute on filtered data
    if (this.filtered) {
      this.filteredTableData.sort(this.sortingFunction.bind(this));

    //Otherwise, execute on all data
    } else {
      this.tableData.sort(this.sortingFunction.bind(this));
    }

    //Re-render sort buttons accordingly
    this.renderSortButtons();

    //Reset to page 1
    this.paginationObj.page = 1;

    //Render new table rows
    this.renderTableRows();

    //Re-render page numbers
    this.setPageNumbers()
  }



  //Re-renders page numbers so current page is always in the "middle"
  setPageNumbers() {

    //Start 2 pages to the "left" of current
    var currentButtonNumber = this.paginationObj.page - 2;

    this.paginationButtonsArray.forEach((button) => {

      //If there aren't enough pages to the 'left'
      if (currentButtonNumber < 1) {

        //Hide the button
        button.style.display = 'none';

      //If there are any pages to the "left"  
      } else {

        //If this is the current page
        if (currentButtonNumber === this.paginationObj.page) {

          //Set as current page for CSS
          button.setAttribute('id','selectedButton');
        }

        //Set default button state
        button.style.display = 'inline-block'
        button.setAttribute('value', currentButtonNumber);
      }

      //Increment page number for next iteration
      currentButtonNumber++;
    })
  }



  sortingFunction(a, b) {

    //If sorting criterion is a number
    if (Number(a.children[this.currentSort.criterion].innerHTML)) {

      //Make data type a number and set as "sortProperty"
      a.children[this.currentSort.criterion].sortProperty = Number(a.children[this.currentSort.criterion].innerHTML);
      b.children[this.currentSort.criterion].sortProperty = Number(b.children[this.currentSort.criterion].innerHTML);

      //Run standard JS number sort
      //Ascending order
      if (this.currentSort.ascending) {
        return a.children[this.currentSort.criterion].sortProperty - b.children[this.currentSort.criterion].sortProperty;
      }
      //Descending order
      else {
        return b.children[this.currentSort.criterion].sortProperty - a.children[this.currentSort.criterion].sortProperty;
      }

    //Else if sorting criterion is a string  
    } else {

      //Set string as sort property
      a.children[this.currentSort.criterion].sortProperty = a.children[this.currentSort.criterion].innerHTML.toUpperCase();
      b.children[this.currentSort.criterion].sortProperty = b.children[this.currentSort.criterion].innerHTML.toUpperCase();

      //Run standard JS string sort
      //Ascending order
      if (this.currentSort.ascending) {
        if (a.children[this.currentSort.criterion].sortProperty < b.children[this.currentSort.criterion].sortProperty) {
          return -1;
        } 
        else if (a.children[this.currentSort.criterion].sortProperty > b.children[this.currentSort.criterion].sortProperty) {
          return 1;
        } else {
          return 0;
        }
      }
      //Descending order
      else {
        if (a.children[this.currentSort.criterion].sortProperty < b.children[this.currentSort.criterion].sortProperty) {
          return 1;
        } 
        else if (a.children[this.currentSort.criterion].sortProperty > b.children[this.currentSort.criterion].sortProperty) {
          return -1;
        } else {
          return 0;
        }
      }
    }
  }




  
  //*** Event Listeners ***

  hideColumnButtonEventListener(hideColumnButton) {
    //Use index of column parent node to determine which column is being hidden
    const hiddenColumnNumber = this.tableHeaders.indexOf(hideColumnButton.parentNode);

    //Hide header column AND all data columns at given index
    this.tableHeaders[hiddenColumnNumber].style.display = 'none';
    this.tableData.forEach((tableRow) => {
      tableRow.children[hiddenColumnNumber].style.display = 'none';
    })

    //Add to list of hidden columns and render list of hidden columns (so that user may "un-hide")
      //HiddenColumnsNode is composed of "undoHiddenColumnNode"s that, when clicked, will un-hide given column 
    this.hiddenColumns.push(hiddenColumnNumber);
    hiddenColumnsNode.style.display = 'inline-block';

    //Create node that, when clicked, will allow user to unhide. Note that this is only created when node is hidden.
    //Node will be rendered as child of "hiddenColumnsNode"
    const undoHiddenColumnNode = document.createElement('span');

    //Messy / inelegant workaround to handle case where multiple columns are hidden (done last minute)
    if (hiddenColumnsNode.children.length > 1) {
      undoHiddenColumnNode.innerHTML = ', ' + hideColumnButton.parentNode.innerText;
    } else {
      undoHiddenColumnNode.innerHTML = hideColumnButton.parentNode.innerText;
    }

    undoHiddenColumnNode.classList.add('undoHiddenColumnNode');

    //Add event listener that removes column from list of hidden columns and traverses dataset "un-hiding" all columns at given index
    undoHiddenColumnNode.addEventListener('click', () => {
      this.unhideColumnEventListener(hiddenColumnNumber, undoHiddenColumnNode);
    })
    //Append node to unhide individual column to the "hiddenColumnsNode" container
    hiddenColumnsNode.appendChild(undoHiddenColumnNode);
  };



  unhideColumnEventListener(hiddenColumnNumber, undoHiddenColumnNode) {

    //Remove "unhide" node from list
    undoHiddenColumnNode.remove();

    //Remove newly "un-hidden" column from list of hidden columns
    this.hiddenColumns.splice(this.hiddenColumns.indexOf(hiddenColumnNumber), 1);

    //"Un-hide" headers and table data at column number
    this.tableHeaders[hiddenColumnNumber].style.display = 'table-cell';
    this.tableData.forEach((tableRow) => {
      tableRow.children[hiddenColumnNumber].style.display = 'table-cell';
    })

    //If there are no more hidden columns, hide the list of hidden columns
    if (this.hiddenColumns.length === 0) {
      hiddenColumnsNode.style.display = 'none';
    }
  }


  
  //Allows for editing of cells
  cellEditorEventListener(e, currentRow) {
    const temp = e.target;

    //Create new form and text input for editing
    //Append text input to form
    const formContainer = document.createElement('form');
    const cellEditor = document.createElement('input');
    cellEditor.setAttribute('type', 'text');
    cellEditor.setAttribute('value', e.target.innerHTML);
    formContainer.appendChild(cellEditor);

    //Replace 'td' cell with form input for editing
    currentRow.replaceChild(formContainer, e.target);

    //Create event listener for editing
    formContainer.addEventListener('submit', (e) => {

      e.preventDefault();

      //When form is submitted, replace original text in 'td' node with edited text from form node
      temp.innerHTML = e.target.children[0].value;

      //Replace form node with edited 'td' node
      currentRow.replaceChild(temp, formContainer);
    })
  }



  //Handle submission of "Search" form
  searchFormSubmitEventListener(form) {

    //Grab search value from text input
    var textValue = form.children[0].value;

    //Filter table to only include rows containing search term
    this.filteredTableData = this.tableData.filter((tableRow) => {
      var include = false;
      for (var i = 0; i < tableRow.children.length; i++) {

        //Handle upper/lowercase letters AND partial matches
        if (tableRow.children[i].innerHTML.toLowerCase().includes(textValue.toLowerCase())) {
          include = true;
        }
      }
      return include;
    })

    //Mark as filtered for rendering
    this.filtered = true;

    //Reset current page to 1 and re-render pagination controls
    this.paginationObj.page = 1;
    this.setPageNumbers();

    //Re-render table rows with filtered data
    this.renderTableRows();

    //"Unhide" button to clear search filters
    clearFilterButton.style.display = 'block';

    //Reset form value to be empty
    form.children[0].value = '';
  }



  //Allows user to change page
  pageChangeClickHandler(e) {

    //Grab new page number from index
    var newPage = Number(e.target.value);

    //Set new page state on class
    this.paginationObj.page = newPage;

    //Re-render table rows with data from next page
    this.renderTableRows(this.paginationObj.page);

    //Change page numbers to keep currently selected page in the "middle"
    this.setPageNumbers()
  }
}

//Initialize App

var table = new SortableTable();
table.run();