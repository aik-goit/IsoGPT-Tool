IsoGO-GPT is a tool that uses large language models (LLMs) to annotate gene isoforms with Gene Ontology (GO) terms.

**Steps to Use**:

**Install Frontend Dependencies**

  - In the pdf-uploader directory, where the package.json is located, run:

        npm install

    This installs all the necessary npm packages for the React frontend.

**Adjust Model Paths in app.py**

  - Inside pdf-uploader/src/app.py, find list_models(). Update these paths to point to your local model directories. For example:

        models = [ 'D:/path/to/your/local/model1', 'D:/path/to/your/local/model2' ]

    Replace the sample paths with the actual paths where your models are stored.

**Start the Backend**

  - From the pdf-uploader/src directory (where app.py resides):

        python app.py

    This starts the Flask backend on http://localhost:5000.

**Start the Frontend**

  - From the pdf-uploader directory (parent of src):

        npm start

    The frontend will run on http://localhost:3000.

**How to Use**

  1. Load a Model: In the frontend, click "Select & Load Model", choose one from the list, then load it.

  2. Smart-Extract (Optional): With a model loaded, you can upload a PDF and specify an isoform name, then "Start Smart-Extracting".
  
  3. Annotate: Enter text into the text area. Optionally customize the prompt. Click "Submit" to obtain GO terms.
  
  4. View & Export Results: Switch between input and highlight views. Save results to CSV if needed.

Now you are ready to use IsoGO-GPT with your own local model paths.
