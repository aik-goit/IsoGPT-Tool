import React, { useState, useEffect } from 'react';
import { Layout, Typography, Input, Button, Drawer, Spin, Card, message, Select, Upload, Tooltip } from 'antd';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { SwapOutlined, UploadOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function App() {
  // State hooks for managing data and UI states
  const [models, setModels] = useState([]);                   // List of available models retrieved from the backend
  const [selectedModel, setSelectedModel] = useState('');     // Currently selected model name
  const [isModelDrawerVisible, setIsModelDrawerVisible] = useState(false); // Controls the visibility of the model selection drawer
  const [currentLoadedModel, setCurrentLoadedModel] = useState(null); // The currently loaded model (if any)
  const [modelLoading, setModelLoading] = useState(false);    // Indicates if model is being loaded/unloaded

  const [response, setResponse] = useState([]);               // List of GO terms received from the backend
  const [terms, setTerms] = useState([]);                     // Parsed GO terms for easier handling
  const [loading, setLoading] = useState(false);              // Indicates if the application is processing input
  const [textInput, setTextInput] = useState('');             // User input text area content
  const [name, setName] = useState('');                       // Isoform name entered by the user
  const [title, setTitle] = useState('');                     // Title of the research paper entered by the user
  const [paperID, setPaperID] = useState('');                 // Paper ID entered by the user
  const [csvFileName, setCsvFileName] = useState('');         // Name of the CSV file to save results
  const [gene, setGene] = useState('');                       // Gene name entered by the user
  const [ensemblAccession, setEnsemblAccession] = useState('');// Ensembl Accession ID entered by the user
  const [isDrawerVisible, setIsDrawerVisible] = useState(false); // Controls the visibility of the side drawer displaying citation details
  const [drawerContent, setDrawerContent] = useState('');     // Content displayed inside the drawer
  const [highlightCitations, setHighlightCitations] = useState([]); // List of citations to highlight in the text
  const [highlightedText, setHighlightedText] = useState(''); // Processed text with highlighted citations
  const [showInput, setShowInput] = useState(true);           // Toggles between input view and results view
  const [customPrompt, setCustomPrompt] = useState('');       // Custom prompt input by the user (optional)
  const [pubmedQuery, setPubmedQuery] = useState('');


  // States related to the Smart-Extract feature
  const [showSmartExtract, setShowSmartExtract] = useState(false); // Toggles Smart-Extract section visibility
  const [file, setFile] = useState(null);                          // The selected PDF file for Smart-Extract
  const [fileList, setFileList] = useState([]);                    // The file list state for the Upload component

  // Fetch available models from backend on component mount
  useEffect(() => {
    axios.get('http://localhost:5000/list-models')
      .then(res => {
        setModels(res.data);
      })
      .catch(err => console.error(err));
  }, []);

  /**
   * Handles loading a selected model by sending a request to the backend.
   * Updates the currentLoadedModel state on success.
   */
  const handleLoadModel = () => {
    if (!selectedModel) {
      message.warning('Please select a model first.');
      return;
    }

    setModelLoading(true);
    axios.post('http://localhost:5000/load-model', { model_id: selectedModel })
      .then(res => {
        message.success(res.data.message);
        setCurrentLoadedModel(selectedModel);
        setIsModelDrawerVisible(false);
        setModelLoading(false);
      })
      .catch(err => {
        message.error(err.response?.data?.error || 'Error loading model');
        setModelLoading(false);
      });
  };

  /**
   * Handles unloading the currently loaded model by sending a request to the backend.
   * Clears the currentLoadedModel state on success.
   */
  const handleUnloadModel = () => {
    if (!currentLoadedModel) {
      message.warning('No model is currently loaded.');
      return;
    }
    setModelLoading(true);
    axios.post('http://localhost:5000/unload-model')
      .then(res => {
        message.success(res.data.message);
        setCurrentLoadedModel(null);
        setModelLoading(false);
      })
      .catch(err => {
        message.error(err.response?.data?.error || 'Error unloading model');
        setModelLoading(false);
      });
  };

  /**
   * Parses a single Goterm string from the backend response into an object with term, name, citation, and reason fields.
   */
  const parseGoterm = (gotermString) => {
    const termMatch = gotermString.match(/Goterm\s*\d*:\s*(GO:\d+)/i);
    const nameMatch = gotermString.match(/Name:\s*(.*)/i);
    const citationMatch = gotermString.match(/Text Citation:\s*"?(.+?)"?(?:\n|$)/i);
    const reasonMatch = gotermString.match(/Reason:\s*(.*)/i);

    return {
      term: termMatch ? termMatch[1] : 'N/A',
      name: nameMatch ? nameMatch[1] : 'N/A',
      citation: citationMatch ? citationMatch[1] : 'N/A',
      reason: reasonMatch ? reasonMatch[1] : 'N/A'
    };
  };

  /**
   * Utility function to generate and trigger a CSV file download in the browser.
   */
  const downloadCsv = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Saves annotations for a single Goterm to a CSV file.
   */
  const handleSaveAnnotations = (goTermString, index) => {
    const parsedGoterm = parseGoterm(goTermString);
    const defaultFileName = `Goterm_${index + 1}.csv`;
    const fileName = csvFileName ? `${csvFileName}_${index + 1}.csv` : defaultFileName;
    const csvContent = `Gene,Isoform,Ensembl Accession,pubmedid,title,abstract/Full-length,GO Terms,GO Titles,excerpt,reasoning\n"${gene}","${name}","${ensemblAccession}","${paperID}","${title}","${textInput}","${parsedGoterm.term}","${parsedGoterm.name}","${parsedGoterm.citation}","${parsedGoterm.reason}"`;
    downloadCsv(csvContent, fileName);
  };

  /**
   * Saves all extracted Goterms together with user inputs into a single CSV file.
   */
  const handleSaveAllAnnotations = () => {
    const fileName = csvFileName ? `${csvFileName}.csv` : 'All_Goterms.csv';
    let csvContent = 'Gene,Isoform,Ensembl Accession,pubmedid,title,abstract/Full-length,GO Terms,GO Titles,excerpt,reasoning\n';
    response.forEach(goTermString => {
      const parsedGoterm = parseGoterm(goTermString);
      csvContent += `"${gene}","${name}","${ensemblAccession}","${paperID}","${title}","${textInput}","${parsedGoterm.term}","${parsedGoterm.name}","${parsedGoterm.citation}","${parsedGoterm.reason}"\n`;
    });
    downloadCsv(csvContent, fileName);
  };

  /**
   * Handles submission of user-entered text to the backend.
   * On success, it retrieves GO terms, parses them, highlights citations and displays results.
   */
  const handleTextSubmit = () => {
    if (!currentLoadedModel) {
      message.warning('Please load a model first before submitting text.');
      return;
    }
    if (!textInput) {
      message.warning('Please enter text input.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('text', textInput);
    formData.append('name', name);
    formData.append('title', title);
    formData.append('paperID', paperID);

    if (customPrompt.trim()) {
      formData.append('custom_prompt', customPrompt);
    }

    axios.post('http://localhost:5000/submit-text', formData)
      .then((res) => {
        const data = res.data;
        if (data.error) {
          message.error(data.error);
          setLoading(false);
          return;
        }
        setResponse(data.goterms);
        const parsedTerms = data.goterms.map((goTermString) => {
          const parsedGoterm = parseGoterm(goTermString);
          console.log("HERE")
          console.log(data.goterms)
          return {
            id: parsedGoterm.term,
            text: parsedGoterm.citation,
            link: `https://www.ebi.ac.uk/QuickGO/term/${parsedGoterm.term}`,
            name: parsedGoterm.name,
            reason: parsedGoterm.reason
          };
        });

        setTerms(parsedTerms);
        const citations = parsedTerms.map((term) => term.text);
        const uniqueCitations = [...new Set(citations)];
        setHighlightCitations(uniqueCitations);
        

        // Highlight the citations in the provided text
        highlightInputText(uniqueCitations);

        // Switch to results view
        setShowInput(false);

        message.info(`Extracted ${parsedTerms.length} terms for highlighting.`);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error submitting text:', error);
        setLoading(false);
      });
  };

  /**
   * Highlights citations in the input text. Different citations are assigned different colors.
   * The text is split into sentences and citations are highlighted as spans.
    */

  const highlightInputText = (citations) => {
    const normalizeText = (str) => {
      return str
        .replace(/-\s*\n\s*/g, '')  
        .replace(/\n+/g, ' ')       
        .replace(/\s+/g, ' ')       
        .replace(/[“”]/g, '"')      
        .replace(/[’‘]/g, "'")      
        .toLowerCase()
        .trim();
    };
     const escapeRegExp = (string) => {
      return string.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    };
     const normalizedInputText = normalizeText(textInput);
    const colorPalette = ['#ffeb3b', '#8bc34a', '#03a9f4', '#ff5722', '#e91e63', '#9c27b0', '#00bcd4', '#cddc39'];
    const citationColorMap = {};
     citations.forEach((citation, index) => {
      citationColorMap[citation] = colorPalette[index % colorPalette.length];
    });
     let highlightedText = textInput;
     citations.forEach((originalCitation) => {
      const normalizedCitation = normalizeText(originalCitation);
      const color = citationColorMap[originalCitation];
      
      const fuzzyCitationRegex = new RegExp(
        escapeRegExp(originalCitation).replace(/\s+/g, '[\\s\\n\\r]+'),
        'gi'
      );

      const question = (highlightedText.includes(originalCitation));


      console.log(originalCitation);
       if (normalizeText(highlightedText).includes(normalizedCitation)) {
        console.log(`Found: ${originalCitation}`);
        highlightedText = highlightedText.replace(fuzzyCitationRegex, (match) => {
          return `<span class="highlight" data-citation="${originalCitation}" style="background-color:${color}">${match}</span>`;
        });
      } else {
        console.warn(`Not found: ${originalCitation}`);
      }
    });
     const sanitizedHTML = DOMPurify.sanitize(highlightedText);
    setHighlightedText(sanitizedHTML);
  };
 
  
  
  

  /**
   * Opens a drawer on the right side displaying details about a particular citation and its associated GO terms.
   */
  const openDrawer = (citation) => {
    const associatedTerms = terms.filter((term) => term.text === citation);

    const content = (
      <div>
        <p><strong>Excerpt/Citation:</strong> {citation}</p>
        <p><strong>Associated GO Terms:</strong></p>
        {associatedTerms.map((term, index) => (
          <div key={index} style={{ marginBottom: '20px' }}>
            <p>
              <strong>GO Term:</strong>
              <a href={term.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
                {term.id}
              </a>
            </p>
            <p><strong>Name:</strong> {term.name}</p>
            <p><strong>Reason:</strong> {term.reason}</p>
          </div>
        ))}
      </div>
    );

    setDrawerContent(content);
    setIsDrawerVisible(true);
    
  };

  /**
   * Closes the citation details drawer.
   */
  const closeDrawer = () => {
    setIsDrawerVisible(false);
  };

  /**
   * Handles click events on the text. If a highlighted citation is clicked, opens the drawer with details.
   */
  const handleTextClick = (e) => {
    if (e.target.classList.contains('highlight')) {
      const citation = e.target.getAttribute('data-citation');
      openDrawer(citation);
    }
  };

  /**
   * Toggles between showing the input area and the results area.
   */
  const toggleInputDisplay = () => {
    setShowInput(!showInput);
  };

  /**
   * Clears the text input field.
   */
  const handleClearText = () => {
    setTextInput('');
  };

  /**
   * Toggles the Smart-Extract section. If no model is loaded, shows a warning.
   */
  const handleSmartExtract = () => {
    if (!currentLoadedModel) {
      message.warning('Please load a model before using Smart-Extract.');
      return;
    }
    setShowSmartExtract(!showSmartExtract);
  };

  /**
   * Handles file changes in the Upload component.
   * Updates the fileList and sets the current file to the last uploaded one.
   */
  const handleFileChange = (info) => {
    setFileList(info.fileList);

    if (info.fileList.length > 0) {
      const latestFile = info.fileList[info.fileList.length - 1];
      if (latestFile && latestFile.originFileObj) {
        setFile(latestFile.originFileObj);
        message.success(`File uploaded: ${latestFile.name}`);
      }
    } else {
      setFile(null);
      message.info('No files uploaded.');
    }
  };

  /**
   * Handles submitting the PDF file and isoform name to the backend for smart extraction.
   */
  const handleSmartExtractSubmit = () => {
    if (!file) {
      message.warning('Please upload a PDF file.');
      return;
    }

    if (!name) {
      message.warning('Please enter an isoform name.');
      return;
    }

    if (!currentLoadedModel) {
      message.warning('Please load a model before using Smart-Extract.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('isoform', name);

    axios
      .post('http://localhost:5000/smart-extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => {
        setTextInput(response.data.result);
        message.success('Smart extraction completed successfully!');
      })
      .catch((error) => {
        console.error('Error during smart extraction:', error);
        message.error('Failed to perform smart extraction.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handlePubmedSearch = () => {
    if (!pubmedQuery.trim()) {
      message.warning('Please enter a PubMed query.');
      return;
    }
  
    axios.post('http://localhost:5000/pubmed-search', { query: pubmedQuery })
      .then((res) => {
        message.success(res.data.message);
        setTextInput(res.data.result.texts);
        console.log('PubMed search result:', res.data.result);
      })
      .catch((err) => {
        message.error(err.response?.data?.error || 'PubMed search failed');
      });
  };
  

  /**
   * Generates the default prompt text that the model uses if no custom prompt is provided.
   */
  const generateDefaultPrompt = () => {
    return `
    You are familiar with all of the Gene Ontology term titles and their descriptions, found on the GO database.

    You will be given isolated excerpts from a scientific Publication which is titled '{title}' with pubmedId '{paperID}'. These excerpts specifically mention the isoform '{name}' and its functional roles. From these excerpts, identify all the Gene Ontology terms that correspond best to the given text. i.e. Use information you have on Gene Ontology terms, their titles and description, to tell me what are the Gene Ontology terms that can be mapped to the '{name}' from this text.

    Also include the reason behind the association between GO term and '{name}' from the text provided, record the portions of text that were used to make the associations.

    Do Not make term associations without EXPLICIT evidence provided in the excerpts, and repeat 3 rounds of analysis before providing me a final answer, but do not reply your process, only reply the final answer. Report only associations reported in human cells/samples.

    Make use of classification hierarchies when you do this. e.g. if the paper indicated that '{name}' is involved in “cardiac muscle cell proliferation”, then the term most corresponding to '{name}' would be “cardiac muscle cell proliferation, whose description is “The expansion of a cardiac muscle cell population by cell division.”

    If text include any iso-form name looks like {name} but have small difference, then it is another isoform, do not mismatch. You are looking for exactly **{name}**, no other isoform.

    [Only include terms that are statistically over-represented and being able to clearly find the citation from the text.]

    Please follow this format strictly when generating a response, any other text except the list will not be accepted:

    Goterm 1: <Goterm 1>
    Name: <Goterm 1 name>
    Text Citation: <text citation for GOterm 1>
    Reason: <reasoning 1> ;

    Goterm 2: <Goterm 2>
    Name: <Goterm 2 name>
    Text Citation: <text citation for GOterm 2>
    Reason: <reasoning 2> ;

    Goterm 3: <Goterm 3>
    Name: <Goterm 3 name>
    Text Citation: <text citation for GOterm 3>
    Reason: <reasoning 3> ;

    Repeat until you have generated the list for all associated GO terms. Remember to switch to a new line when you try generate for different Goterm.
    Generate the list directly, no need to generate any other text except the list.
    `;
  };

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header Section */}
      <Header style={{ color: 'white', textAlign: 'center', height: '100px', background: 'transparent' }}>
        <Title style={{ color: 'white', margin: '10px 0', fontFamily: 'Poppins, sans-serif', fontSize: '32px', fontWeight: 'bold' }}>
          Gene Ontology Annotation Tool
        </Title>
      </Header>

      {/* Main Content */}
      <Content style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'row', gap: '20px' }}>
          {/* Left Column: Input Fields and Results List */}
          <div style={{ flex: 1, backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', height: '800px' }}>
            {/* Button to open model selection drawer */}
            <Button
              type="primary"
              style={{ marginBottom: '20px' }}
              onClick={() => setIsModelDrawerVisible(true)}
              disabled={modelLoading}
            >
              {currentLoadedModel ? `Current Model: ${currentLoadedModel}` : 'Select & Load Model'}
            </Button>

            {/* Unload model button appears only if a model is loaded */}
            {currentLoadedModel && (
              <Button
                type="primary"
                danger
                style={{ marginBottom: '20px' }}
                onClick={handleUnloadModel}
                disabled={modelLoading}
              >
                Unload Current Model
              </Button>
            )}

            {modelLoading && <Spin tip="Loading/Unloading model..." style={{ marginBottom: '20px' }} />}

            {/* Input fields for gene, isoform, ensembl accession, title, paper ID and CSV file name */}
            <div style={{ marginBottom: '20px' }}>
              <Input
                value={gene}
                onChange={(e) => setGene(e.target.value)}
                placeholder="Enter Gene"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Isoform name"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Input
                value={ensemblAccession}
                onChange={(e) => setEnsemblAccession(e.target.value)}
                placeholder="Enter Ensembl Accession"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title of the paper"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Input
                value={paperID}
                onChange={(e) => setPaperID(e.target.value)}
                placeholder="Enter paper ID"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Input
                value={csvFileName}
                onChange={(e) => setCsvFileName(e.target.value)}
                placeholder="Enter the name of the CSV file you want to save"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Input
                value={pubmedQuery}
                onChange={(e) => setPubmedQuery(e.target.value)}
                placeholder="Enter PubMed search query"
                style={{ borderRadius: '8px', fontFamily: 'Poppins, sans-serif', marginBottom: '20px' }}
              />

              <Button
                type="primary"
                onClick={handlePubmedSearch}
                style={{ width: '100%', marginBottom: '20px', borderRadius: '8px', backgroundColor: '#16a085' }}
              >
                Run PubMed Search
              </Button>   
            </div>

            

            

            {/* Show a loading spinner while processing text */}
            {loading ? (
              <Spin tip="Processing..." style={{ display: 'block', marginTop: '20px' }} />
            ) : (
              <>
                {/* If goterms have been extracted, show a button to save all to CSV */}
                {Array.isArray(response) && response.length > 0 && (
                  <Button
                    type="primary"
                    onClick={handleSaveAllAnnotations}
                    style={{ width: '100%', marginBottom: '20px', borderRadius: '8px', backgroundColor: '#f39c12' }}
                  >
                    Save All to CSV
                  </Button>
                )}

                {/* List each extracted Goterm if available */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {Array.isArray(response) && response.length > 0 ? (
                    response.map((goTermString, index) => {
                      const parsedGoterm = parseGoterm(goTermString);
                      return (
                        <Card key={index} title={`Goterm ${index + 1}`} bordered={false} style={{ backgroundColor: '#f7faff', borderRadius: '8px', marginBottom: '20px' }}>
                          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'Poppins, sans-serif', fontSize: '14px' }}>
                            <strong>GOterm:</strong> {parsedGoterm.term} {"\n"}
                            <strong>Name:</strong> {parsedGoterm.name} {"\n"}
                            <strong>Text Citation:</strong> <span style={{ marginLeft: '20px', display: 'inline-block' }}>{parsedGoterm.citation}</span> {"\n"}
                            <strong>Reason:</strong> <span style={{ marginLeft: '20px', display: 'inline-block' }}>{parsedGoterm.reason}</span>
                          </pre>
                          <Button
                            type="primary"
                            onClick={() => handleSaveAnnotations(goTermString, index)}
                            style={{ width: '100%', borderRadius: '8px', backgroundColor: '#52c41a' }}
                          >
                            Save Goterm {index + 1} to CSV
                          </Button>
                        </Card>
                      );
                    })
                  ) : (
                    <div>No Goterm data found.</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Input Text Area, Smart-Extract, and Text Highlighting */}
          <div style={{ flex: 1, backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflowY: 'auto', maxHeight: '800px', position: 'relative' }}>
            {/* Button to toggle between input view and highlighted results view */}
            <Button
              type="primary"
              onClick={toggleInputDisplay}
              shape="circle"
              icon={<SwapOutlined />}
              style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1 }}
            />

            {showInput ? (
              <>
                {/* Smart-Extract Button */}
                <Tooltip title={!currentLoadedModel ? "Please load a model first" : ""}>
                  <Button
                    type="primary"
                    onClick={handleSmartExtract}
                    style={{ borderRadius: '8px', backgroundColor: '#1890ff', marginBottom: '20px' }}
                    disabled={!currentLoadedModel}
                  >
                    Smart-Extract
                  </Button>
                </Tooltip>

                {/* Smart-Extract Section (visible only if showSmartExtract is true) */}
                {showSmartExtract && (
                  <div
                    style={{
                      padding: '20px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <Upload
                      beforeUpload={() => false} // Prevent automatic upload
                      onChange={handleFileChange}
                      accept=".pdf"
                      fileList={fileList}
                    >
                      <Button
                        icon={<UploadOutlined />}
                        style={{ width: '100%', borderRadius: '8px' }}
                      >
                        Upload PDF
                      </Button>
                    </Upload>

                    <Button
                      type="primary"
                      onClick={handleSmartExtractSubmit}
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        backgroundColor: '#1890ff',
                      }}
                      disabled={!file || loading || !currentLoadedModel}
                    >
                      Start Smart-Extracting
                    </Button>
                  </div>
                )}

                {/* Text area for user input */}
                <TextArea
                  rows={20}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter your text here..."
                  style={{ marginBottom: '20px', borderRadius: '8px' }}
                />

                {/* Submit and Clear Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tooltip title={!currentLoadedModel ? "Please load a model first" : ""}>
                    <Button
                      type="primary"
                      onClick={handleTextSubmit}
                      style={{ width: '48%', borderRadius: '8px', backgroundColor: '#667eea' }}
                      disabled={!currentLoadedModel}
                    >
                      Submit
                    </Button>
                  </Tooltip>
                  <Button type="default" onClick={handleClearText} style={{ width: '48%', borderRadius: '8px' }}>
                    Clear
                  </Button>
                </div>

                {/* Default Prompt and Custom Prompt Section */}
                <div style={{ marginTop: '20px', backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                  <Title level={4} style={{ fontFamily: 'Poppins, sans-serif' }}>Default Prompt</Title>
                  <TextArea
                    rows={6}
                    value={generateDefaultPrompt()}
                    readOnly
                    style={{ marginBottom: '20px', borderRadius: '8px' }}
                  />

                  <Title level={4} style={{ fontFamily: 'Poppins, sans-serif' }}>Custom Prompt (optional)</Title>
                  <TextArea
                    rows={6}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Enter your custom prompt here if you want to override the default prompt."
                    style={{ marginBottom: '20px', borderRadius: '8px' }}
                  />
                </div>
              </>
            ) : (
              // When showInput is false, display the highlighted text
              highlightedText && (
                <div
                  onClick={handleTextClick}
                  dangerouslySetInnerHTML={{ __html: highlightedText }}
                  style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', lineHeight: '1.6', textAlign: 'justify' }}
                />
              )
            )}
          </div>
        </div>
      </Content>

      {/* Footer Section */}
      <Footer style={{ textAlign: 'center', color: 'white', backgroundColor: 'transparent', fontFamily: 'Poppins, sans-serif', marginTop: 'auto' }}>
        Gene Ontology Tool ©2024
      </Footer>

      {/* Drawer for Citation and GO Term Details */}
      <Drawer
        title="Citation and GO Term Information"
        placement="right"
        onClose={closeDrawer}
        visible={isDrawerVisible}
      >
        {drawerContent}
      </Drawer>

      {/* Drawer for Model Selection */}
      <Drawer
        title="Select a Model to Load"
        placement="right"
        onClose={() => setIsModelDrawerVisible(false)}
        visible={isModelDrawerVisible}
      >
        <Select
          style={{ width: '100%', marginBottom: '20px' }}
          placeholder="Select a model"
          onChange={(value) => setSelectedModel(value)}
          value={selectedModel}
        >
          {models.map((m, idx) => (
            <Option key={idx} value={m}>{m}</Option>
          ))}
        </Select>
        <Button type="primary" onClick={handleLoadModel} style={{ width: '100%' }}>
          Load Model
        </Button>
      </Drawer>
    </Layout>
  );
}

export default App;

// Styles for highlight elements
const style = document.createElement('style');
style.innerHTML = `
  .highlight {
    opacity: 0.8;
    padding: 2px;
    border-radius: 2px;
    position: relative;
    cursor: pointer;
  }
`;
document.head.appendChild(style);














