import React, {
  useState, useRef, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  FormGroup,
  FormCheck,
  FormControlInput,
  FormPassword,
  FormControlSelect,
} from 'saagie-ui/react';

const propTypes = {
  onUpdate: PropTypes.func,
  formName: PropTypes.string.isRequired,
  formValues: PropTypes.object,
  contextFolderPath: PropTypes.string,
  field: PropTypes.object,
};

const defaultProps = {
  onUpdate: () => {},
  formValues: {},
  contextFolderPath: '',
  field: {},
};

export const SmartField = ({
  onUpdate = () => {},
  formValues = {},
  formName,
  contextFolderPath,
  field: {
    type,
    name,
    label,
    required,
    helper,
    options,
    dependsOn,
    value,
  },
}) => {
  const [error, setError] = useState();

  const currentForm = formValues?.[formName] || {};

  const shouldBeDisplayed = !dependsOn || dependsOn?.every((x) => currentForm[x]);
  const dependsOnValues = JSON.stringify(dependsOn?.map((x) => currentForm[x]));

  // State for input data fetching. This is used to auto fill the inputs.
  const [formControlInputValue, setFormControlInputValue] = useState('');
  const [formControlInputLoading, setFormControlInputLoading] = useState(Boolean(value && typeof value === 'object' && value.script));

  const currentFormRef = useRef();
  currentFormRef.current = currentForm;

  const fieldValue = currentForm[name] || formControlInputValue;

  const handleFormControlInput = useCallback((e) => {
    setFormControlInputValue('');
    onUpdate({ name, value: e.target.value });
  }, [onUpdate, name]);

  const triggerInputDataFetching = () => {
    if (value && typeof value === 'object' && value.script && shouldBeDisplayed && formControlInputLoading) {
      const fetchValue = async () => {
        try {
          const { data } = await axios.post('/api/action', {
            script: `${contextFolderPath}/${value.script}`,
            function: value.function,
            params: {
              featuresValues: currentFormRef.current,
            },
          });

          onUpdate({ name, value: data });
        } catch (err) {
          setError(err.response?.data);
        }

        setFormControlInputLoading(false);
      };

      fetchValue();
    }
  };

  const getField = () => {
    switch (type) {
    case 'RADIO': {
      const radioProps = Array.isArray(options) ? options : [];
      return (
        radioProps?.map((radio) => (
          <FormCheck
            isRadio
            key={radio.value}
            value={radio.value}
            name={name}
            onChange={(e) => onUpdate({ name, value: e.target.value })}
          >{radio.label || ''}
          </FormCheck>
        ))
      );
    }
    case 'TEXTAREA':
      triggerInputDataFetching();

      return (
        <FormControlInput
          name={name}
          tag="textarea"
          value={fieldValue || ''}
          autoComplete={name}
          onChange={handleFormControlInput}
          required={required}
          isLoading={formControlInputLoading}
        />
      );

    case 'TEXT':
      triggerInputDataFetching();

      return (
        <FormControlInput
          name={name}
          value={fieldValue || ''}
          autoComplete={name}
          onChange={handleFormControlInput}
          required={required}
          isLoading={formControlInputLoading}
        />
      );

    case 'URL':
      triggerInputDataFetching();

      return (
        <FormControlInput
          name={name}
          value={fieldValue || ''}
          autoComplete={name}
          type="url"
          onChange={handleFormControlInput}
          isLoading={formControlInputLoading}
        />
      );

    case 'PASSWORD':
      return (
        <FormPassword
          name={name}
          value={fieldValue || ''}
          autoComplete={name}
          onChange={(e) => onUpdate({ name, value: e.target.value })}
        />
      );

    case 'SELECT': {
      const selectProps = Array.isArray(options)
        // Hard coded options in context.yaml
        ? {
          options: options?.map((option) => (
            { value: option.id, label: option.label, payload: option }
          )),
        }
        // Dynamic options in custom JavaScript files
        : {
          isAsync: true,
          cacheOptions: true,
          defaultOptions: true,
          loadOptions: async () => {
            setError(null);

            if (
              !shouldBeDisplayed
              || !options
              || !options.script
              || !options.function
            ) {
              return options;
            }

            try {
              const { data } = await axios.post('/api/action', {
                script: `${contextFolderPath}/${options.script}`,
                function: options.function,
                params: {
                  featuresValues: currentFormRef.current,
                },
              });

              return data?.map((x) => ({ value: x.id, label: x.label, payload: x }));
            } catch (err) {
              setError(err.response?.data);
            }

            return [];
          },
        };

      return (
        <FormControlSelect
          // Used to avoid long label to be cropped when selected. Closes #65.
          // By adding this prop, it also remove the horizontal scrollbar.
          menuPortalTarget={document.body}
          name={name}
          onChange={({ payload }) => {
            onUpdate({ name, value: payload });
          }}
          value={fieldValue ? {
            label: fieldValue.label,
            value: fieldValue.id,
            payload: fieldValue,
          } : null}
          {...selectProps}
        />
      );
    }
    case 'ENDPOINT':
      if (formName === 'endpoint') {
        return (
          <div className="sui-m-message as--light as--danger">
            You can&apos;t use a type <code>ENDPOINT</code> in endpoint features.
          </div>
        );
      }
      return (
        <FormControlSelect
          name={name}
          isClearable
          options={[{ value: formValues?.endpoint, label: 'Use Endpoint Form' }]}
          onChange={(val) => onUpdate({ name, value: val ? formValues?.endpoint : undefined })}
        />
      );

    case 'ARTIFACT':
      return type;

    case 'COMMAND_LINE':
      return type;

    default:
      return type;
    }
  };

  if (!shouldBeDisplayed) {
    return '';
  }

  return (
    <FormGroup
      key={dependsOnValues}
      label={label}
      helper={helper}
      isOptional={!required}
      validationState={error ? 'danger' : undefined}
      feedbackMessage={error ? error.message : undefined}
    >
      {getField()}
    </FormGroup>
  );
};

SmartField.propTypes = propTypes;
SmartField.defaultProps = defaultProps;
