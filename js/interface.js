var widgetInstanceId = $('[data-widget-id]').data('widget-id');
var data = Fliplet.Widget.getData(widgetInstanceId) || {};

var $dataSource = $("#dataSource");
var $emailSettings = $('.email-settings');
var $smsSettings = $('.sms-settings');

var defaultEmailTemplate = $('#email-template-default').html();
var defaultEmailSettings = {
  subject: 'Validate your email address',
  html: defaultEmailTemplate,
  to: []
};

var defaultSmsTemplate = 'Your code: {{ code }}';
var dataSources;
var dataSource;

var emailProvider;
var emailProviderResult;

Fliplet.Widget.onSaveRequest(function() {
  if (!dataSource) {
    return Fliplet.Widget.save({});
  }

  if (emailProvider) {
    return emailProvider.forwardSaveRequest();
  }

  return dsQueryProvider.forwardSaveRequest();
});

/**
 * Set current data source and fill in fields 
 */
function selectDataSource(ds) {
  dataSource = ds;
  var sms = dataSource.definition && dataSource.definition.validation && dataSource.definition.validation.sms || {};
  $('#sms-template').val(sms.template || defaultSmsTemplate);
  $('#sms-expire').val(sms.expire || '');

  var email = dataSource.definition && dataSource.definition.validation && dataSource.definition.validation.email || {};
  $('#email-expire').val(email.expire || '');
  
  Fliplet.Widget.autosize();
}

var dsQueryData = {
  settings: {
    dataSourceLabel: 'Select a data source',
    modesDescription: 'What method would you like to use to send the code?',
    modes: [
      {
        label: 'SMS',
        filters: false,
        columns: [
          {
            key: 'smsMatch',
            label: 'Select the column to match',
            type: 'single'
          },
          {
            key: 'smsTo',
            label: 'Select the column to send',
            type: 'single'
          }
        ]
      },
      {
        label: 'Email',
        filters: false,
        columns: [
          {
            key: 'emailMatch',
            label: 'Select the column to match',
            type: 'single'
          },
          {
            key: 'emailTo',
            label: 'Select the column to send',
            type: 'single'
          }
        ]
      }
    ]
  },
  result: data.dataSourceQuery
};

// Open data source query provider inline
var dsQueryProvider = Fliplet.Widget.open('com.fliplet.data-source-query', {
  selector: '.data-source-query-provider',
  data: dsQueryData,
  onEvent: function (event, data) {
    if (event === 'mode-changed') {
      switch (data.value) {
        case null:
        case 0:
          $emailSettings.addClass('hidden');
          $smsSettings.removeClass('hidden');
          break;
        case 1:
          $emailSettings.removeClass('hidden');
          $smsSettings.addClass('hidden');
          break;
          
        default:
          break;
      }

      return true; // Stop propagation up to studio or parent components
    }

    if (event === 'data-source-changed') {
      selectDataSource(data);

      return true; // Stop propagation up to studio or parent components
    }
  }
});

dsQueryProvider.then(function onForwardDsQueryProvider(result) {
    var validation = {
      sms: {
        toColumn: result.data.columns.smsTo,
        matchColumn: result.data.columns.smsMatch,
        template: $('#sms-template').val(),
        expire: $('#sms-expire').val(),
      },
      email: {
        toColumn: result.data.columns.emailTo,
        matchColumn: result.data.columns.emailMatch,
        template: emailProviderResult || defaultEmailSettings,
        expire: $('#email-expire').val(),
      }
    }

      // Update data source definitions 
    var options = {
      id: result.data.dataSourceId,
      definition: { validation: validation }
    };
    Fliplet.DataSources.update(options)
      .then(function() {
        data = {
          type: result.data.selectedModeIdx === 1 ? 'email' : 'sms',
          dataSourceQuery: result.data
        } 

        // Save
        Fliplet.Widget.save(data);
      })
  });

// Click to edit email template should open email provider
$('.show-email-provider').on('click', function() {
  var emailProviderData = dataSource.definition && dataSource.definition.validation && dataSource.definition.validation.email && dataSource.definition.validation.email.emailProvider || defaultEmailSettings;
  emailProvider = Fliplet.Widget.open('com.fliplet.email-provider', {
    data: emailProviderData 
  });

  emailProvider.then(function onForwardEmailProvider(result) {
    emailProvider = null;
    emailProviderResult = result.data;
  }); 
});

// Initialize data. SMS by default
if (data.type === 'email') {
  $emailSettings.removeClass('hidden');
} else {
  $smsSettings.removeClass('hidden');
}
